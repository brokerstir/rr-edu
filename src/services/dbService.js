import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
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
 * Fetch student profile & role attributes from DynamoDB
 */
export async function fetchUserProfile(userId) {
  try {
    const resolvedUserId = resolveUserId(userId);
    if (!resolvedUserId) return null;
    const db = await getDbClient();
    const res = await db.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${resolvedUserId}`, SK: 'PROFILE' }
    }));
    return res.Item || null;
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return null;
  }
}

export const getUserProfile = fetchUserProfile;

/**
 * Sync or create student profile & entitlements on login, retaining assigned role (e.g. admin)
 */
export async function syncUserProfile(user) {
  try {
    const db = await getDbClient();
    const userId = resolveUserId(user);
    if (!userId) {
      console.warn('Cannot sync user profile: no userId resolved');
      return null;
    }

    // Check existing profile to retain existing role, tier, etc.
    let existingProfile = null;
    try {
      const res = await db.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: 'PROFILE' }
      }));
      existingProfile = res.Item;
    } catch (fetchErr) {
      console.warn('Could not check existing profile during sync:', fetchErr);
    }

    const role = existingProfile?.role || 'student';
    const tier = existingProfile?.tier || 'free';
    const email = user.attributes?.email || existingProfile?.email || '';

    const profile = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      email,
      role,
      tier,
      updatedAt: new Date().toISOString()
    };

    await db.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: profile
    }));

    return profile;
  } catch (err) {
    console.error('Error syncing user profile:', err);
    return null;
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
    const resolvedUserId = resolveUserId(userId);
    if (!resolvedUserId) return [];
    const db = await getDbClient();
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

/**
 * Fetch all enrolled courses for a user
 */
export async function fetchUserEnrollments(userId) {
  try {
    const resolvedUserId = resolveUserId(userId);
    if (!resolvedUserId) return [];
    const db = await getDbClient();
    const res = await db.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${resolvedUserId}`,
        ':skPrefix': 'ENROLLMENT#'
      }
    }));
    return res.Items || [];
  } catch (err) {
    console.error('Error fetching user enrollments:', err);
    return [];
  }
}

/**
 * Enroll a user in a course
 */
export async function enrollUserInCourse({ userId, courseId, tier = 'free' }) {
  try {
    const resolvedUserId = resolveUserId(userId);
    if (!resolvedUserId) {
      console.warn('Cannot enroll user: no userId resolved');
      return null;
    }
    const db = await getDbClient();
    const timestamp = new Date().toISOString();
    const item = {
      PK: `USER#${resolvedUserId}`,
      SK: `ENROLLMENT#${courseId}`,
      courseId,
      tier,
      enrolledAt: timestamp,
      updatedAt: timestamp
    };

    await db.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    }));
    return item;
  } catch (err) {
    console.error('Error enrolling user in course:', err);
    throw err;
  }
}

/**
 * Report a question defect or parsing issue (Admin tool)
 * Persists to rr-edu-data-dev with:
 * PK: ISSUE#<course_id>
 * SK: TOPIC#<topic_id>#Q#<question_id>
 */
export async function reportQuestionIssue({ courseId, topicId, questionId, issueType, notes, userId }) {
  try {
    const db = await getDbClient();
    const resolvedUserId = resolveUserId(userId);
    if (!resolvedUserId) {
      throw new Error('User authentication required to report an issue.');
    }
    const cleanUserId = resolvedUserId.replace(/^USER#/, '');
    const timestamp = new Date().toISOString();
    const pk = `ISSUE#${courseId}`;
    const sk = `TOPIC#${topicId}#Q#${questionId}`;

    // Preserve original createdAt if item already exists
    let createdAt = timestamp;
    try {
      const existing = await db.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: pk, SK: sk }
      }));
      if (existing.Item?.createdAt) {
        createdAt = existing.Item.createdAt;
      }
    } catch (e) {
      console.warn('Could not read existing issue before put:', e);
    }

    const item = {
      PK: pk,
      SK: sk,
      courseId,
      topicId: String(topicId),
      questionId: String(questionId),
      reportedBy: `USER#${cleanUserId}`,
      issueType,
      notes: notes || '',
      status: 'open',
      createdAt,
      updatedAt: timestamp
    };

    await db.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    }));

    return item;
  } catch (err) {
    console.error('Error reporting question issue:', err);
    throw err;
  }
}

/**
 * Mark a question as verified during admin audit
 * Persists to rr-edu-data-dev with:
 * PK: AUDIT#<course_id>
 * SK: TOPIC#<topic_id>#Q#<question_id>
 */
export async function verifyQuestion({ courseId, topicId, questionId, userId }) {
  try {
    const db = await getDbClient();
    const resolvedUserId = resolveUserId(userId);
    if (!resolvedUserId) {
      throw new Error('User authentication required to verify question.');
    }
    const cleanUserId = resolvedUserId.replace(/^USER#/, '');
    const timestamp = new Date().toISOString();
    const pk = `AUDIT#${courseId}`;
    const sk = `TOPIC#${topicId}#Q#${questionId}`;

    const item = {
      PK: pk,
      SK: sk,
      courseId,
      topicId: String(topicId),
      questionId: String(questionId),
      status: 'verified',
      verifiedBy: `USER#${cleanUserId}`,
      verifiedAt: timestamp
    };

    await db.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    }));

    return item;
  } catch (err) {
    console.error('Error verifying question:', err);
    throw err;
  }
}

/**
 * Unverify / re-flag a previously verified question
 */
export async function unverifyQuestion({ courseId, topicId, questionId }) {
  try {
    const db = await getDbClient();
    const pk = `AUDIT#${courseId}`;
    const sk = `TOPIC#${topicId}#Q#${questionId}`;

    await db.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk }
    }));

    return { courseId, topicId, questionId, status: 'unverified' };
  } catch (err) {
    console.error('Error unverifying question:', err);
    throw err;
  }
}

/**
 * Query all verified questions for a course (and optional topic)
 */
export async function getVerifiedQuestions(courseId, topicId) {
  try {
    if (!courseId) return [];
    const db = await getDbClient();
    const pk = `AUDIT#${courseId}`;

    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': pk
      }
    };

    if (topicId !== undefined && topicId !== null) {
      params.KeyConditionExpression = 'PK = :pk AND begins_with(SK, :skPrefix)';
      params.ExpressionAttributeValues[':skPrefix'] = `TOPIC#${topicId}#Q#`;
    }

    const res = await db.send(new QueryCommand(params));
    return res.Items || [];
  } catch (err) {
    console.error('Error fetching verified questions:', err);
    return [];
  }
}

