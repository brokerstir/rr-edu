import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { fetchAuthSession } from '@aws-amplify/auth';

const TABLE_NAME = 'rr-edu-data-dev';
const REGION = 'us-east-1';

// Helper to instantiate authenticated DynamoDB document client
async function getDbClient() {
  const session = await fetchAuthSession();
  const credentials = session.credentials;
  
  if (!credentials) {
    throw new Error('User is not authenticated.');
  }

  const client = new DynamoDBClient({
    region: REGION,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken
    }
  });

  return DynamoDBDocumentClient.from(client);
}

/**
 * Resolves user ID consistently across Email and OAuth login providers
 */
export function resolveUserId(user) {
  if (!user) return '';
  if (typeof user === 'string') return user;
  return user.userId || user.attributes?.sub || user.username || '';
}

export const getUserId = resolveUserId;

/**
 * Sync or create student profile & entitlements on login
 */
export async function syncUserProfile(user) {
  try {
    const db = await getDbClient();
    const userId = resolveUserId(user);
    if (!userId) {
      console.warn('Cannot sync user profile: no userId resolved');
      return;
    }

    const profile = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      email: user.attributes?.email || '',
      role: 'student',
      tier: 'free',
      updatedAt: new Date().toISOString()
    };

    await db.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: profile
    }));
  } catch (err) {
    console.error('Error syncing user profile:', err);
  }
}

/**
 * Record a question attempt (supports self-graded & auto-graded history)
 */
export async function saveQuestionAttempt({ userId, courseId, questionId, mode, result, score }) {
  try {
    const db = await getDbClient();
    const resolvedUserId = resolveUserId(userId);
    if (!resolvedUserId) {
      console.warn('Cannot save question attempt: no userId resolved');
      return;
    }
    const timestamp = new Date().toISOString();
    const sk = `PROGRESS#${courseId}#${questionId}`;

    // Get current record if exists
    const existing = await db.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${resolvedUserId}`, SK: sk }
    }));

    const history = existing.Item?.history || [];
    history.push({ timestamp, mode, result, score });

    const item = {
      PK: `USER#${resolvedUserId}`,
      SK: sk,
      courseId,
      questionId,
      attemptCount: (existing.Item?.attemptCount || 0) + 1,
      lastAttemptAt: timestamp,
      latestResult: result,
      history
    };

    await db.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    }));
  } catch (err) {
    console.error('Error saving progress:', err);
  }
}

/**
 * Fetch all question progress for a course
 */
export async function fetchCourseProgress(userId, courseId) {
  try {
    const db = await getDbClient();
    const resolvedUserId = resolveUserId(userId);
    if (!resolvedUserId) return [];
    const res = await db.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${resolvedUserId}`,
        ':skPrefix': `PROGRESS#${courseId}#`
      }
    }));
    return res.Items || [];
  } catch (err) {
    console.error('Error fetching course progress:', err);
    return [];
  }
}