import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListCustomerOrdersQuery, ListCustomersQuery } from "./customer.validation";
import { customerService } from "./customer.service";

export const listCustomers = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListCustomersQuery>(req);
  const result = await customerService.list(query);
  return sendSuccess(res, result);
});

export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.getById(String(req.params.id));
  return sendSuccess(res, customer);
});

export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.create(req.body, req.user?.id);
  return sendCreated(res, customer, "Customer created");
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.update(String(req.params.id), req.body, req.user?.id);
  return sendSuccess(res, customer, "Customer updated");
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  await customerService.remove(String(req.params.id), req.user?.id);
  return sendSuccess(res, null, "Customer deleted");
});

export const listCustomerOrders = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListCustomerOrdersQuery>(req);
  const result = await customerService.listOrders(String(req.params.id), query);
  return sendSuccess(res, result);
});
