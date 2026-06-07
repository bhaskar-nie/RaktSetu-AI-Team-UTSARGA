import { NextResponse } from 'next/server'
import { authMiddleware } from 'lyzr-architect'
import { invokeClaude } from '@/lib/aws/bedrock'

export const dynamic = 'force-dynamic'

export const POST = authMiddleware(async (req) => {
  try {
    const body = await req.json()
    const medicalNotes = String(body?.medicalNotes || '').trim()
    if (!medicalNotes) {
      return NextResponse.json(
        { success: false, error: 'medicalNotes is required' },
        { status: 400 }
      )
    }

    const prompt = `You are a medical report summarizer. Summarize the following blood bank medical notes into a structured JSON with: patient_summary (string), blood_type_relevance (string), recommended_actions (array of strings), urgency_level (one of: low, medium, high, critical). Notes: ${medicalNotes}. Return ONLY valid JSON, no markdown, no code fences.`

    const result = await invokeClaude({ prompt, maxTokens: 1500, temperature: 0.2 })
    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }
    const rawText = result.data?.text || ''

    // Defensive JSON parsing
    let parsed: any = null
    try {
      const cleaned = rawText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()
      const firstBrace = cleaned.indexOf('{')
      const lastBrace = cleaned.lastIndexOf('}')
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1))
      }
    } catch {
      parsed = null
    }

    if (!parsed || typeof parsed !== 'object') {
      return NextResponse.json({
        success: true,
        data: {
          parsed: null,
          rawText,
          warning: 'Could not parse JSON, showing raw text instead',
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        parsed: {
          patient_summary: parsed.patient_summary || '',
          blood_type_relevance: parsed.blood_type_relevance || '',
          recommended_actions: Array.isArray(parsed.recommended_actions)
            ? parsed.recommended_actions
            : [],
          urgency_level: parsed.urgency_level || 'unknown',
        },
        rawText,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Bedrock summarize failed' },
      { status: 500 }
    )
  }
})
