import { AppError } from "../shared/errors/app-error";
import type { AuthContext } from "../shared/types/auth-context";

const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.mock("../config/prisma", () => ({
  prisma: {
    activity: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

import { activityService } from "../modules/activities/activity.service";

const auth: AuthContext = {
  userId: "user-1",
  sessionId: "session-1",
  roles: ["User"],
  permissions: ["manage:activities"],
  organizationId: "org-1",
  organizationRole: "MEMBER",
};

describe("activityService org isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects update when activity is outside organization", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      activityService.updateActivity("activity-1", { subject: "Updated" }, auth),
    ).rejects.toMatchObject({ statusCode: 404, code: "ACTIVITY_NOT_FOUND" });

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "activity-1", organizationId: "org-1" },
      select: { id: true, userId: true, contactId: true, dealId: true },
    });
  });

  it("rejects delete when activity is outside organization", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(activityService.deleteActivity("activity-1", auth)).rejects.toBeInstanceOf(
      AppError,
    );
  });

  it("deletes activity within organization", async () => {
    mockFindFirst.mockResolvedValue({ id: "activity-1", userId: "user-1" });
    mockDelete.mockResolvedValue({});

    await activityService.deleteActivity("activity-1", auth);

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "activity-1" } });
  });
});
