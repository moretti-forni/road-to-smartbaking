import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { z } from 'zod';
import { ApiError } from '../services/errors.mjs';
const responseSchema = z.object({ status: z.number().int().min(200).max(599), body: z.unknown() });
let client;
export async function invokeDataApi({ method, url, body }, transport) {
  const arn = process.env.RTSM_DATA_FUNCTION_ARN;
  if (!arn) throw new ApiError(503, 'Data service is not configured');
  client ??= new LambdaClient({
    region: process.env.RTSM_AWS_REGION || process.env.AWS_REGION,
    maxAttempts: 1,
  });
  try {
    const response = await (transport ?? client).send(
      new InvokeCommand({
        FunctionName: arn,
        InvocationType: 'RequestResponse',
        Payload: Buffer.from(JSON.stringify({ method, url, body })),
      }),
    );
    if (response.FunctionError || !response.Payload) throw new Error('Data function failed');
    const result = responseSchema.parse(JSON.parse(Buffer.from(response.Payload).toString('utf8')));
    return result;
  } catch {
    throw new ApiError(503, 'Data service unavailable');
  }
}
