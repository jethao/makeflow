export function getDesignPromptGuidance(designType) {
  if (designType === "mechanical") {
    return "Focus on enclosure, materials, mounting, thermal, ingress, serviceability, assembly, tolerances, and mechanical risks.";
  }
  if (designType === "electrical") {
    return [
      "Focus on power architecture, sensors, battery/charging if relevant, radios, connectors, PCB partitioning, safety, EMI/EMC, and electrical validation.",
      "The document must include a `## Block Diagram` section with a fenced ASCII block diagram showing power source, regulators, MCU or processor, PCB partitions, sensors, radios, connectors, actuators, user-interface electronics, and external interfaces where relevant."
    ].join(" ");
  }
  if (designType === "software") {
    return [
      "Cover firmware, mobile app, and backend. Include system architecture, data flow, APIs, device communication, state handling, security, observability, update strategy, and testing.",
      "The document must include a `## Block Diagram` section with a fenced ASCII block diagram showing firmware, device services, mobile app, backend services, data stores, external integrations, update channel, telemetry path, and user/device communication boundaries where relevant."
    ].join(" ");
  }
  if (designType === "industrial") {
    return "Focus on user-facing form, ergonomics, CMF, branding, affordances, accessibility, physical interaction, packaging cues, and manufacturable appearance.";
  }
  return "Create a test specification covering mechanical, electrical, firmware, mobile app, backend, integration, reliability, manufacturing, and acceptance tests.";
}
