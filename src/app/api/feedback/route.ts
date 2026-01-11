import { NextRequest, NextResponse } from 'next/server';
import { SupportService } from '@/services/support-service';
import { classifyFeedback } from '@/ai/classify-feedback';

export async function POST(request: NextRequest) {
    try {
        let body;
        try {
            body = await request.json();
        } catch (parseError) {
            return NextResponse.json(
                { error: 'Invalid JSON in request body' },
                { status: 400 }
            );
        }

        const { message, user } = body;

        // Validate input
        if (!message || !message.trim()) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        // Extract user ID - try from user object or use anonymous
        let userId = 'anonymous';
        let userEmail: string | undefined;
        let userName: string | undefined;

        if (user) {
            // Try to get user ID from various possible fields
            // Splitwise user object has 'id' field as string/number
            userId = user.id ? String(user.id) : (user.user_id || user.userId || 'anonymous');
            userEmail = user.email;
            userName = user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`.trim()
                : (user.first_name || user.name || undefined);
        }

        // Classify feedback using AI
        const classification = await classifyFeedback(message, userId);

        console.log('--- AI FEEDBACK CLASSIFICATION ---');
        console.log(`Message: "${message.substring(0, 50)}..."`);
        console.log(`Classified as: ${classification.type} (Confidence: ${classification.confidence})`);
        console.log('----------------------------------');

        // Submit to database
        const requestId = await SupportService.submitSupportRequest({
            user_id: String(userId),
            type: classification.type,
            message: message.trim(),
            user_email: userEmail,
            user_name: userName,
            metadata: {
                submitted_via: 'profile_overlay',
                timestamp: new Date().toISOString(),
                ai_classification: classification
            }
        });

        return NextResponse.json(
            {
                success: true,
                message: 'Feedback received successfully',
                classification: classification.type,
                requestId
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error processing feedback:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
