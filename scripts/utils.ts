import childProcess from 'node:child_process';

interface GITOptions extends SpawnOptions {
  quiet?: boolean;
}

export function git(options?: GITOptions) {
  const cmdOptions = options?.quiet === true ? ['--quiet'] : [];
  return {
    clone(...args: ReadonlyArray<string>): void {
      spawn('git', ['clone', ...cmdOptions, ...args], options);
    },
    checkout(...args: ReadonlyArray<string>): void {
      spawn('git', ['checkout', ...cmdOptions, ...args], options);
    },
    revParse(...args: ReadonlyArray<string>): string {
      return spawnOutput('git', ['rev-parse', ...cmdOptions, ...args], options);
    },
    revList(...args: ReadonlyArray<string>): Array<string> {
      const allArgs = ['rev-list', ...cmdOptions, ...args];
      const result = spawnOutput('git', allArgs, options);
      return result === '' ? [] : result.split('\n');
    },
    catFile(...args: ReadonlyArray<string>): string {
      return spawnOutput('git', ['cat-file', ...cmdOptions, ...args], options);
    },
    log(...args: ReadonlyArray<string>): string {
      return spawnOutput('git', ['log', ...cmdOptions, ...args], options);
    },
  };
}

interface SpawnOptions {
  cwd?: string;
  env?: typeof process.env;
}

export function spawnOutput(
  command: string,
  args: ReadonlyArray<string>,
  options?: SpawnOptions,
): string {
  const result = childProcess.spawnSync(command, args, {
    maxBuffer: 10 * 1024 * 1024, // 10MB
    stdio: ['inherit', 'pipe', 'inherit'],
    encoding: 'utf-8',
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }

  return result.stdout.toString().trimEnd();
}

function spawn(
  command: string,
  args: ReadonlyArray<string>,
  options?: SpawnOptions,
): void {
  const result = childProcess.spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}
