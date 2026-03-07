function shouldRunSeed() {
  return /^(1|true|yes)$/i.test(process.env.RUN_DB_SEED ?? '');
}

async function main() {
  if (!shouldRunSeed()) {
    // eslint-disable-next-line no-console
    console.info('[seed-runtime] RUN_DB_SEED is not enabled, skipping seed');
    return;
  }

  // eslint-disable-next-line no-console
  console.info('[seed-runtime] RUN_DB_SEED enabled, running seed');
  await import('./seed');
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
