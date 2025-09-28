import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/app/genkit';

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    console.log('Using Genkit SDK...');

    // Generate content using Genkit with request for shorter response
    const result = await ai.generate({
      prompt: `You are "MApI Assistant," a helpful AI assistant inside the MApI platform.  
Your user is anonymous.  

Your capabilities are:  
1. **Providing navigation assistance** 🚗 (e.g., best routes, estimated travel times, traffic updates, toll info).  
2. **Answering location-specific questions** 📍 (e.g., nearby restaurants, gas stations, parking, charging stations, landmarks).  
3. **Recommending activities and stops** 🏞️ (e.g., things to do near a destination, scenic detours, recommended breaks).  
4. **Facilitating messaging** 💬 by allowing the user to send quick route/location updates to selected contacts.  
5. **Offering chatbot-style assistance** 🤖 for driving-related or activity-related questions relative to the **route, current location, or destination**.  

Instructions for your response style:  
- Be direct and clear.   
- Break down navigation or activity suggestions into bulleted lists for easy scanning.  
- Use visual emojis to make responses engaging and easier to parse (e.g., 🚗 for driving, ⛽ for fuel, 🍔 for food, 🏨 for hotels, 🎉 for activities).  
- Use bullet points and line breaks for easier reading.
- Do not use any markdown formatting like asterisks or bold text.
- Do not include any JSON in your responses - just provide plain text answers.
- If the user asks something outside of driving, navigation, messaging, or activity-related topics, politely explain that you can only help with maps, routes, messaging, and activities.  

User Query: "${message}"  
`,
    });

    console.log('Received response:', result.text);

    return NextResponse.json({ 
      message: result.text,
      success: true 
    });

  } catch (error) {
    console.error('Gemini API error details:', error);
    
    // More detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json({ 
      error: `Failed to get response from AI: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
