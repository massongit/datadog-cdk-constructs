import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { GoFunction } from "@aws-cdk/aws-lambda-go-alpha";
import { Function } from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

import { Datadog } from "datadog-cdk-constructs-v2";
import { Duration, Stack, StackProps } from "aws-cdk-lib";

export class TypescriptV2Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    console.log("Creating Hello World stack");

    const helloNode = new Function(this, "cdk-v2-hello-node", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset("../lambda/javascript"),
      handler: "hello.lambda_handler",
    });

    const helloPython = new Function(this, "cdk-v2-hello-python", {
      runtime: lambda.Runtime.PYTHON_3_7,
      code: lambda.Code.fromAsset("../lambda/python"),
      handler: "hello.lambda_handler",
    });

    const helloGo = new GoFunction(this, "cdk-v2-hello-go", {
      entry: "../lambda/go/hello.go",
      functionName: "cdk-al2-arm-go-handler",
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.PROVIDED_AL2,
      timeout: Duration.seconds(30),
      bundling: {
        goBuildFlags: ['-ldflags "-s -w"'],
      },
      environment: {
        LOG_LEVEL: "INFO",
        TABLE_NAME: "HelloWorld",
      },
    });

    const apig = new apigateway.RestApi(this, "RestAPI").root;
    apig.addResource("node").addProxy({
      anyMethod: true,
      defaultIntegration: new apigateway.LambdaIntegration(helloNode),
    });
    apig.addResource("python").addProxy({
      anyMethod: true,
      defaultIntegration: new apigateway.LambdaIntegration(helloPython),
    });
    apig.addResource("go").addProxy({
      anyMethod: true,
      defaultIntegration: new apigateway.LambdaIntegration(helloGo),
    });

    console.log("Instrumenting with Datadog");

    const DatadogCDK = new Datadog(this as any, "Datadog", {
      nodeLayerVersion: 99,
      pythonLayerVersion: 81,
      extensionLayerVersion: 49,
      addLayers: true,
      apiKey: process.env.DD_API_KEY,
      enableDatadogTracing: true,
      enableDatadogASM: true,
      flushMetricsToLogs: true,
      site: "datadoghq.com",
    });

    DatadogCDK.addLambdaFunctions([helloNode, helloPython, helloGo]);
  }
}
