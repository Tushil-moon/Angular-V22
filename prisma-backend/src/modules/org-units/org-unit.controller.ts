import { asyncHandler } from "../../shared/utils/async-handler";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import { orgUnitService } from "./org-unit.service";

export const getUnitTree = asyncHandler(async (req, res) => {
  const tree = await orgUnitService.getTree(getAuthContext(req));
  return sendSuccess(res, tree);
});

export const listUnits = asyncHandler(async (req, res) => {
  const units = await orgUnitService.list(getAuthContext(req));
  return sendSuccess(res, units);
});

export const getUnit = asyncHandler(async (req, res) => {
  const unit = await orgUnitService.getById(String(req.params.unitId), getAuthContext(req));
  return sendSuccess(res, unit);
});

export const createUnit = asyncHandler(async (req, res) => {
  const unit = await orgUnitService.create(req.body, getAuthContext(req));
  return sendCreated(res, unit, "Org unit created");
});

export const updateUnit = asyncHandler(async (req, res) => {
  const unit = await orgUnitService.update(String(req.params.unitId), req.body, getAuthContext(req));
  return sendSuccess(res, unit, "Org unit updated");
});

export const deleteUnit = asyncHandler(async (req, res) => {
  await orgUnitService.remove(String(req.params.unitId), getAuthContext(req));
  return sendSuccess(res, null, "Org unit deleted");
});

export const listUnitMembers = asyncHandler(async (req, res) => {
  const members = await orgUnitService.listUnitMembers(String(req.params.unitId), getAuthContext(req));
  return sendSuccess(res, members);
});

export const addUnitMember = asyncHandler(async (req, res) => {
  const member = await orgUnitService.addUnitMember(
    String(req.params.unitId),
    req.body,
    getAuthContext(req),
  );
  return sendCreated(res, member, "Member assigned to unit");
});

export const removeUnitMember = asyncHandler(async (req, res) => {
  await orgUnitService.removeUnitMember(
    String(req.params.unitId),
    String(req.params.userId),
    getAuthContext(req),
  );
  return sendSuccess(res, null, "Member removed from unit");
});

export const listEmployees = asyncHandler(async (req, res) => {
  const employees = await orgUnitService.listEmployees(getAuthContext(req));
  return sendSuccess(res, employees);
});

export const getEmployeeHierarchy = asyncHandler(async (req, res) => {
  const hierarchy = await orgUnitService.getHierarchy(getAuthContext(req));
  return sendSuccess(res, hierarchy);
});

export const updateMemberProfile = asyncHandler(async (req, res) => {
  const employee = await orgUnitService.updateMemberProfile(
    String(req.params.userId),
    req.body,
    getAuthContext(req),
  );
  return sendSuccess(res, employee, "Employee profile updated");
});
