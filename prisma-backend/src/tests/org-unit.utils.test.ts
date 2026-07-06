import { buildOrgUnitTree, collectDescendantIds } from "../modules/org-units/org-unit.utils";

describe("org unit utils", () => {
  it("builds a nested tree", () => {
    const tree = buildOrgUnitTree([
      {
        id: "branch",
        parentId: null,
        type: "BRANCH",
        name: "HQ",
        code: "HQ",
        description: null,
        managerUserId: null,
        isActive: true,
        sortOrder: 0,
      },
      {
        id: "dept",
        parentId: "branch",
        type: "DEPARTMENT",
        name: "Sales",
        code: "SALES",
        description: null,
        managerUserId: null,
        isActive: true,
        sortOrder: 0,
      },
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.children).toHaveLength(1);
    expect(tree[0]?.children[0]?.name).toBe("Sales");
  });

  it("collects descendant ids", () => {
    const descendants = collectDescendantIds(
      [
        { id: "a", parentId: null },
        { id: "b", parentId: "a" },
        { id: "c", parentId: "b" },
      ],
      "a",
    );

    expect([...descendants]).toEqual(expect.arrayContaining(["a", "b", "c"]));
  });
});
