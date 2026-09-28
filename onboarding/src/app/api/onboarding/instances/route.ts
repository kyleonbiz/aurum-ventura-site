import { connectDB } from '@/lib/db';
import { OnboardingInstanceModel, BusinessModel } from '@/lib/models';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-middleware';
import { generateUniqueId, generateToken } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      clientName,
      clientCompany,
      clientEmail,
      clientPhone,
      templateId,
    } = body;

    if (!clientName || !clientCompany || !clientEmail || !clientPhone) {
      return createErrorResponse('Missing required fields', 400);
    }

    // Use default business
    const businessId = 'default';
    const uniqueId = generateUniqueId();
    const token = generateToken();

    const instance = await OnboardingInstanceModel.create({
      businessId,
      uniqueId,
      token,
      clientName,
      clientCompany,
      clientEmail,
      clientPhone,
      templateId: templateId || 'default',
      status: 'pending',
      progress: 0,
      responses: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return createSuccessResponse(
      {
        id: instance._id,
        uniqueId: instance.uniqueId,
        clientName: instance.clientName,
        status: instance.status,
      },
      201
    );
  } catch (error) {
    console.error('Error creating onboarding instance:', error);
    return createErrorResponse('Failed to create onboarding instance', 500);
  }
}

export async function GET(request: Request) {
  try {
    await connectDB();

    const businessId = 'default';

    const instances = await OnboardingInstanceModel.find({
      businessId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return createSuccessResponse({
      instances,
      count: instances.length,
    });
  } catch (error) {
    console.error('Error fetching instances:', error);
    return createErrorResponse('Failed to fetch instances', 500);
  }
}
