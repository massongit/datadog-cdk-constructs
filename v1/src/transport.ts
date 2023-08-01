/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache License Version 2.0.
 *
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2021 Datadog, Inc.
 */

import * as lambda from "@aws-cdk/aws-lambda";
import log from "loglevel";
import {
  runtimeLookup,
  RuntimeType,
  API_KEY_ENV_VAR,
  API_KEY_SECRET_ARN_ENV_VAR,
  KMS_API_KEY_ENV_VAR,
  SITE_URL_ENV_VAR,
  FLUSH_METRICS_TO_LOGS_ENV_VAR,
} from "./index";

export const transportDefaults = {
  site: "datadoghq.com",
  flushMetricsToLogs: true,
  enableDatadogTracing: true,
};

export class Transport {
  flushMetricsToLogs: boolean;
  site: string;
  apiKey?: string;
  apiKeySecretArn?: string;
  apiKmsKey?: string;
  extensionLayerVersion?: number;

  constructor(
    flushMetricsToLogs?: boolean,
    site?: string,
    apiKey?: string,
    apiKeySecretArn?: string,
    apiKmsKey?: string,
    extensionLayerVersion?: number,
  ) {
    if (flushMetricsToLogs === undefined) {
      log.debug(`No value provided for flushMetricsToLogs, defaulting to ${transportDefaults.flushMetricsToLogs}`);
      this.flushMetricsToLogs = transportDefaults.flushMetricsToLogs;
    } else {
      this.flushMetricsToLogs = flushMetricsToLogs;
    }

    this.extensionLayerVersion = extensionLayerVersion;
    // If the extension is used, metrics will be submitted via the extension.
    if (this.extensionLayerVersion !== undefined) {
      log.debug(`Using extension version ${this.extensionLayerVersion}, metrics will be submitted via the extension`);
      this.flushMetricsToLogs = false;
    }

    if (site === undefined) {
      log.debug(`No value provided for site, defaulting to ${transportDefaults.site}`);
      this.site = transportDefaults.site;
    } else {
      this.site = site;
    }

    this.apiKey = apiKey;
    this.apiKeySecretArn = apiKeySecretArn;
    this.apiKmsKey = apiKmsKey;
  }

  applyEnvVars(lambdas: lambda.Function[]) {
    log.debug(`Setting Datadog transport environment variables...`);
    lambdas.forEach((lam) => {
      lam.addEnvironment(FLUSH_METRICS_TO_LOGS_ENV_VAR, this.flushMetricsToLogs.toString());
      if (this.site !== undefined && this.flushMetricsToLogs === false) {
        lam.addEnvironment(SITE_URL_ENV_VAR, this.site);
      }
      if (this.apiKey !== undefined) {
        lam.addEnvironment(API_KEY_ENV_VAR, this.apiKey);
      }
      if (this.apiKeySecretArn !== undefined) {
        const isNode = runtimeLookup[lam.runtime.name] === RuntimeType.NODE;
        const isSendingSynchronousMetrics = this.extensionLayerVersion === undefined && !this.flushMetricsToLogs;
        if (isSendingSynchronousMetrics && isNode) {
          throw new Error(
            `\`apiKeySecretArn\` is not supported for Node runtimes when using Synchronous Metrics. Use either \`apiKey\` or \`apiKmsKey\`.`,
          );
        }
        lam.addEnvironment(API_KEY_SECRET_ARN_ENV_VAR, this.apiKeySecretArn);
      }
      if (this.apiKmsKey !== undefined) {
        lam.addEnvironment(KMS_API_KEY_ENV_VAR, this.apiKmsKey);
      }
    });
  }
}