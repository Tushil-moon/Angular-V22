import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListContactsQuery } from "./contact.validation";
import { contactService } from "./contact.service";

export const listContacts = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListContactsQuery>(req);
  const result = await contactService.listContacts(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getContact = asyncHandler(async (req, res) => {
  const contact = await contactService.getContactById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, contact);
});

export const createContact = asyncHandler(async (req, res) => {
  const contact = await contactService.createContact(req.body, getAuthContext(req));
  return sendCreated(res, contact, "Contact created");
});

export const updateContact = asyncHandler(async (req, res) => {
  const contact = await contactService.updateContact(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, contact, "Contact updated");
});

export const deleteContact = asyncHandler(async (req, res) => {
  await contactService.deleteContact(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Contact deleted");
});

export const convertLead = asyncHandler(async (req, res) => {
  const result = await contactService.convertLead(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, result, "Lead converted");
});

export const checkDuplicates = asyncHandler(async (req, res) => {
  const matches = await contactService.checkDuplicates(req.body, getAuthContext(req));
  return sendSuccess(res, matches);
});

export const getContactDuplicates = asyncHandler(async (req, res) => {
  const matches = await contactService.findDuplicatesForContact(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, matches);
});

export const mergeContacts = asyncHandler(async (req, res) => {
  const contact = await contactService.mergeContacts(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, contact, "Contacts merged");
});

export const importContacts = asyncHandler(async (req, res) => {
  const result = await contactService.importContacts(req.body, getAuthContext(req));
  return sendCreated(res, result, "Contacts imported");
});

export const importContactsCsv = asyncHandler(async (req, res) => {
  const result = await contactService.importContactsCsv(req.body, getAuthContext(req));
  return sendCreated(res, result, "Contacts imported from CSV");
});

export const exportContacts = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListContactsQuery>(req);
  const result = await contactService.exportContacts(query, getAuthContext(req));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="contacts.csv"');
  return res.status(200).send(result.csv);
});
