/* @flow */

import { dirname, normalize, relative, resolve } from 'path';
import { format } from 'util';

import { glob } from '../async';
import Suite from './Suite';
import {testsDir} from '../constants';

import type {Tests} from './Tester';

const testSuiteRegex = /(.*)[\/\\]test.js/;

async function findTestSuites(): Promise<Array<string>> {
  const testSuites = await glob(
    format("%s/**/test.js", testsDir),
    {cwd: __dirname},
  );
  // On Windows, glob still uses unix dir seperators, so we need to normalize
  return testSuites.map(normalize);
}

export default async function(suitesOrig: ?Set<string>): Promise<{ [key: string]: Suite }> {
  let suites = null;
  if (suitesOrig != null) {
    suites = new Set();
    for (let suite of suitesOrig) {
      suite = normalize(suite.trim());
      suites.add(suite);
      suites.add(resolve(suite));
    }
  }
  const testSuites = await findTestSuites();

  const result = {};

  process.stderr.write(format("Found %d suites\n", testSuites.length));
  for (const suiteFile of testSuites) {
    const suiteName = relative(testsDir, suiteFile).replace(testSuiteRegex, "$1");
    const pathToDir = dirname(suiteFile);
    if (!suites || suites.has(suiteName) || suites.has(suiteFile) || suites.has(pathToDir)) {
      const {default: suite} = (require: any)(suiteFile);
      if (!(suite instanceof Suite)) {
        throw new Error(format(
          "Test suite `%s` forgot to export default suite(...)",
          suiteFile,
        ));
      }
      result[suiteName] = suite;
    }
  }

  return result;
}
