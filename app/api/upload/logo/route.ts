import { NextResponse } from "next/server"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"

const MAX_FILE_SIZE = 3 * 1024 * 1024 // 3MB
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"])

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const session = await auth()
        if (!session?.user?.businessId) {
          throw new Error("Unauthorized")
        }

        const payload = clientPayload ? (JSON.parse(clientPayload) as { fileType?: string }) : {}
        const fileType = payload.fileType || ""

        if (!ALLOWED_TYPES.has(fileType)) {
          throw new Error("Only JPG and PNG files are allowed")
        }

        return {
          allowedContentTypes: ["image/png", "image/jpeg"],
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ businessId: session.user.businessId }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = tokenPayload ? (JSON.parse(tokenPayload) as { businessId?: string }) : {}
        const businessId = payload.businessId

        if (!businessId) {
          throw new Error("Missing business context")
        }

        await sql`
          UPDATE businesses
          SET logo_url = ${blob.url}, updated_at = NOW()
          WHERE id = ${businessId}
        `
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload logo"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
