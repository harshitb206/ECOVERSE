"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

const avatarOptions = [
  { id: "avatar-1", label: "Leafy", src: "/avatars/av1.jpg" },
  { id: "avatar-2", label: "Sunny", src: "/avatars/av2.jpg" },
  { id: "avatar-3", label: "Rocky", src: "/avatars/av3.jpg" },
  { id: "avatar-4", label: "Aqua", src: "/avatars/av4.jpg" },
  { id: "avatar-5", label: "River", src: "/avatars/av5.jpg" },
  { id: "avatar-6", label: "Jasper", src: "/avatars/av6.jpg" },
  { id: "avatar-7", label: "Ember", src: "/avatars/av7.jpg" },
  { id: "avatar-8", label: "Blaze", src: "/avatars/av8.jpg" },
]

export default function AvatarSelectionPage() {
  const [selected, setSelected] = useState<string | null>(null)

  const handleSave = () => {
    if (selected) {
      localStorage.setItem("avatarId", selected)
      const user = JSON.parse(localStorage.getItem("ecoverse-user") || "{}")
const updatedUser = { ...user, avatarId: selected }

localStorage.setItem("ecoverse-user", JSON.stringify(updatedUser))
window.location.href = "/dashboard"
    }
  }
  
  return (
    <div className="min-h-screen bg-muted/20 py-12 px-6 md:px-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center gradient-text-green">Choose Your Avatar</h1>
        <p className="text-center text-muted-foreground">Customize your EcoVerse identity with a unique avatar!</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 place-items-center">
          {avatarOptions.map(({ id, label, src }) => (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className={`p-2 rounded-xl transition-all border-2 ${
                selected === id
                  ? "border-green-500 scale-105 shadow-lg"
                  : "border-transparent hover:border-green-300"
              }`}
            >
              <Image src={src} alt={label} width={80} height={80} className="rounded-full" />
              <p className="text-center mt-2 text-sm text-muted-foreground">{label}</p>
            </button>
          ))}
        </div>

        <div className="text-center">
          <Button
            onClick={handleSave}
            className="btn-glow-primary px-8 py-2 text-lg rounded-full"
            disabled={!selected}
          >
            Save Avatar
          </Button>
        </div>
      </div>
    </div>
  )
}
