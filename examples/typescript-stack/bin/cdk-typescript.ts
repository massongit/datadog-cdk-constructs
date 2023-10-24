#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { TypescriptV2Stack } from "../lib/cdk-typescript-stack";

const app = new cdk.App();
new TypescriptV2Stack(app, "TypescriptV2Stack", {});
app.synth();
