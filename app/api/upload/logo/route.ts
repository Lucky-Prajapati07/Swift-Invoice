import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { mkdir, writeFile } from "fs/promises"
import path from "path"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"])

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "")
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 })
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only JPG and PNG files are allowed" }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File is too large. Max size is 5MB" }, { status: 400 })
  }

  const extension = file.type === "image/png" ? "png" : "jpg"
  const filename = `${sanitizeSegment(session.user.businessId)}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`

  const uploadDir = path.join(process.cwd(), "public", "uploads", "logos")
  await mkdir(uploadDir, { recursive: true })

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  await writeFile(path.join(uploadDir, filename), buffer)

  const logoUrl = `/uploads/logos/${filename}`
  return NextResponse.json({ logoUrl })
}
