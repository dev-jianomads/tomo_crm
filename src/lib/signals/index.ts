/**
 * Signal batch helpers (SRS §3.5). Nightly worker imports from here.
 * A6: never gate `re_engagement` on off-channel — keep event-driven path separate.
 */
export * from "./offChannelRules";
