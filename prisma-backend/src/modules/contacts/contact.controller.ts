import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListContactsQuery } from "./contact.validation";
import { contactService } from "./contact.service";

export const listContacts = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListContactsQuery>(req);
  const result = await contactService.listContacts(query);
  return sendSuccess(res, result);
});

export const getContact = asyncHandler(async (req, res) => {
  const contact = await contactService.getContactById(String(req.params.id));
  return sendSuccess(res, contact);
});

export const createContact = asyncHandler(async (req, res) => {
  const contact = await contactService.createContact(req.body, req.user!.id);
  return sendCreated(res, contact, "Contact created");
});

export const updateContact = asyncHandler(async (req, res) => {
  const contact = await contactService.updateContact(String(req.params.id), req.body);
  return sendSuccess(res, contact, "Contact updated");
});

export const deleteContact = asyncHandler(async (req, res) => {
  await contactService.deleteContact(String(req.params.id));
  return sendSuccess(res, null, "Contact deleted");
});
