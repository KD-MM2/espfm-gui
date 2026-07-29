import type { FanSample } from "./fanSample";

type Handler = (sample: FanSample) => void;

class EventBus {
  private handlers = new Set<Handler>();

  subscribe(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  publish(sample: FanSample): void {
    for (const handler of this.handlers) {
      try {
        handler(sample);
      } catch (e) {
        console.error("EventBus handler error:", e);
      }
    }
  }
}

export const eventBus = new EventBus();
