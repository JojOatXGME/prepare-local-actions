import {getInput, group, info, setFailed, warning} from '@actions/core';
import {isDirectory} from '@actions/io/lib/io-util';
import {ReserveCacheError, restoreCache, saveCache} from '@actions/cache';
import {createHash} from 'crypto';
import {createReadStream, Dirent, promises} from 'fs';
import {resolve} from 'path';
import {exec} from '@actions/exec';
import readdir = promises.readdir;

async function main() {
  const actionsDir = getInput('actions_dir');
  if (!(await isDirectory(actionsDir))) {
    throw new Error(`Directory ${actionsDir} does not exit`);
  }

  const [cacheHit, cacheKey] = await group(
    'Search for cached results',
    async () => {
      const filesHash = await hashFiles(actionsDir);
      const cacheKey = `local-actions-preparation-${filesHash}`;
      info(`Cache key is: ${cacheKey}`);

      const key = await restoreCache([actionsDir], cacheKey);
      if (key == null) {
        info(`Cache not found for key: ${cacheKey}`);
        return [false, cacheKey];
      } else {
        info(`Cache restored from key: ${key}`);
        return [true, cacheKey];
      }
    }
  );

  // if (cacheHit) {
  //   return;
  // }

  await group('Install dependencies', async () => {
    await exec('npm', ['ci'], {cwd: actionsDir});
  });

  await group('Build actions', async () => {
    await exec('npm', ['run', 'build'], {cwd: actionsDir});
  });

  await group('Cache result for the future', async () => {
    try {
      await saveCache([actionsDir], cacheKey);
    } catch (error) {
      info(error.name);
      info(ReserveCacheError.name);
      if (error.name === ReserveCacheError.name) {
        info(error.message);
      } else {
        warning(error);
      }
    }
  });
}

async function hashFiles(directory: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const file of listDirectoryRecursively(directory)) {
    await new Promise((resolve, reject) => {
      hash.update(file);
      const s = createReadStream(file);
      s.on('data', data => {
        hash.update(data);
      });
      s.on('end', () => {
        resolve();
      });
      s.on('error', error => {
        reject(error);
      });
    });
  }
  return hash.digest('hex');
}

async function* listDirectoryRecursively(dir: string): AsyncGenerator<string> {
  const entries: Dirent[] = await readdir(dir, {withFileTypes: true});

  // We sort the entries to ensure a consistent order. A consistent order is
  //  important for hashFiles(), since it must create consistent hashes.
  entries.sort((a, b) => (a.name < b.name ? -1 : 1));

  for (const entry of entries) {
    const fullName = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      yield* listDirectoryRecursively(fullName);
    } else {
      yield fullName;
    }
  }
}

main().catch(reason => {
  setFailed(reason instanceof Error ? reason : new Error(reason));
});
