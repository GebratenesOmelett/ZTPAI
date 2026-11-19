const { createEventBus } = require("../../src/events/eventBus");

const flush = () => new Promise(resolve => setImmediate(resolve));

function setup() {
    const logger = { error: jest.fn() };
    return { bus: createEventBus({ logger }), logger };
}

describe("eventBus", () => {
    test("delivers the event with name, occurredAt and payload", async () => {
        const { bus } = setup();
        const handler = jest.fn();
        bus.subscribe("reservation.created", handler);

        bus.publish("reservation.created", { reservationId: 1 });
        await flush();

        expect(handler).toHaveBeenCalledWith({
            name: "reservation.created",
            occurredAt: expect.any(String),
            payload: { reservationId: 1 }
        });
    });

    test("publish returns before the handler runs", async () => {
        const { bus } = setup();
        const handler = jest.fn();
        bus.subscribe("reservation.created", handler);

        bus.publish("reservation.created", {});

        expect(handler).not.toHaveBeenCalled();
        await flush();
        expect(handler).toHaveBeenCalledTimes(1);
    });

    test.each([
        ["synchronous throw", () => { throw new Error("listener failed"); }],
        ["rejected promise", async () => { throw new Error("listener failed"); }]
    ])("isolates listener errors (%s) and logs them", async (_, failingHandler) => {
        const { bus, logger } = setup();
        const healthyHandler = jest.fn();
        bus.subscribe("reservation.created", failingHandler);
        bus.subscribe("reservation.created", healthyHandler);

        expect(() => bus.publish("reservation.created", {})).not.toThrow();
        await flush();

        expect(healthyHandler).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith("[event:reservation.created] handler failed", expect.any(Error));
    });
});
