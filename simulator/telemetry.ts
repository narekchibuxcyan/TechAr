export interface TelemetryReading {
  metric: string;
  value: number;
  unit: string;
}

let tick = 0;
let batteryLevel = 100;

/**
 * Generates plausible sensor drift (a slow sine/cosine wander plus small
 * noise, and a battery that only ever discharges) rather than pure random
 * noise, so a telemetry chart watching this device shows a believable trend
 * instead of a flat scatterplot.
 */
export function generateReadings(): TelemetryReading[] {
  tick += 1;
  batteryLevel = Math.max(5, batteryLevel - Math.random() * 0.3);

  const temperature = 21 + Math.sin(tick / 12) * 3 + (Math.random() - 0.5);
  const humidity = 50 + Math.cos(tick / 18) * 10 + (Math.random() - 0.5) * 2;
  const signalStrength = -50 - Math.random() * 20;

  return [
    { metric: "temperature", value: Number(temperature.toFixed(1)), unit: "°C" },
    { metric: "humidity", value: Number(humidity.toFixed(1)), unit: "%" },
    { metric: "batteryLevel", value: Number(batteryLevel.toFixed(1)), unit: "%" },
    { metric: "signalStrength", value: Number(signalStrength.toFixed(0)), unit: "dBm" },
  ];
}
