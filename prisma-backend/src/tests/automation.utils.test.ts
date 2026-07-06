import { parseWorkflowDefinition, normalizeWorkflowDefinition } from "../modules/workflows/workflow.utils";
import { deliveryBackoffMs, shouldRetryDelivery } from "../modules/webhooks/webhook.utils";

describe("workflow.utils", () => {
  it("parses workflow step definitions", () => {
    const steps = parseWorkflowDefinition({
      steps: [
        { order: 1, type: "CREATE_TASK", config: { title: "Follow up" } },
        { order: 0, type: "ASSIGN_OWNER", config: { ownerId: "user-1" } },
      ],
    });

    expect(steps).toHaveLength(2);
    expect(steps[0]?.type).toBe("ASSIGN_OWNER");
    expect(steps[1]?.type).toBe("CREATE_TASK");
  });

  it("normalizes invalid steps", () => {
    const definition = normalizeWorkflowDefinition({
      steps: [{ order: 0, type: "INVALID", config: {} }],
    });
    expect(definition.steps).toEqual([]);
  });
});

describe("webhook.utils", () => {
  it("allows retry within max attempts", () => {
    expect(shouldRetryDelivery(1)).toBe(true);
    expect(shouldRetryDelivery(3)).toBe(false);
  });

  it("computes exponential backoff", () => {
    expect(deliveryBackoffMs(1)).toBe(2000);
    expect(deliveryBackoffMs(10)).toBe(60_000);
  });
});
