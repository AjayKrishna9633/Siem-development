// The current time, behind a port so tests can move it.
export interface IClock {
  now(): Date;
}
