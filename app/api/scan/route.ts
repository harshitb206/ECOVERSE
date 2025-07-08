import { NextResponse } from "next/server"
import axios from "axios"
import dbConnect from "@/lib/mongodb"
import User from "@/models/User"
import { calculateCarbonFootprint } from "@/lib/carbon-calculator"
import {
  calculateScanPoints,
  calculateLevel,
  checkAchievements,
  calculateMonthlyBonus,
  confirmPendingPoints,
  getUserPointsSummary,
} from "@/lib/rewards-system"
import { inferPackaging } from "@/lib/packaging-inference"

type OpenFoodFactsResponse = {
  product: {
    product_name?: string;
    brands?: string;
    categories_tags?: string[];
    ingredients_text?: string;
  };
  status: number;
  code: string;
};

export async function POST(req: Request) {
  const { barcode, userEmail } = await req.json()

  if (!barcode) {
    return NextResponse.json({ error: "Barcode missing" }, { status: 400 })
  }

  try {
    const productRes = await axios.get<OpenFoodFactsResponse>(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    )

    const product = productRes.data.product

    if (!product?.product_name) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const categories = (product.categories_tags || []).map(cat => cat.replace("en:", ""))
    const packaging = inferPackaging(categories)

    const carbonData = calculateCarbonFootprint(product.product_name, product.brands)
    const carbonEstimate = carbonData.carbonFootprint

    if (userEmail) {
      try {
        await dbConnect()

        const user = await User.findOne({ email: userEmail })

        if (!user) {
          console.error("❌ No user found with email:", userEmail)
          return NextResponse.json({ error: "User not found" }, { status: 404 })
        } else {
          console.log("✅ User found:", user.email)
        }


        if (user) {
          const isFirstScan = (user.totalScanned ?? 0) === 0
          const streakCount = user.streakCount ?? 0
          const totalScans = user.totalScanned ?? 0

          const pointsData = calculateScanPoints
            ? calculateScanPoints(carbonEstimate, isFirstScan, streakCount, totalScans)
            : { points: 0, reasons: [], isConfirmed: false }

          const isConfirmed = pointsData.isConfirmed
          const pointsEarned = pointsData.points

          // ✅ Update user in DB
          const updateFields: any = {
            $inc: {
              monthlyCarbon: carbonEstimate,
              totalScanned: 1,
              ...(isConfirmed
                ? { "points.confirmed": pointsEarned }
                : { "points.unconfirmed": pointsEarned })
            },
            $set: {
              updatedAt: new Date()
            }
          }

          const updatedUser = await User.findOneAndUpdate(
            { email: userEmail },
            updateFields,
            { new: true }
          )

          if (!updatedUser) {
            return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
          }

          const oldLevel = user.level || 1
          const levelData = calculateLevel ? calculateLevel(updatedUser) : { level: oldLevel }
          const earnedAchievements = checkAchievements ? checkAchievements(updatedUser) : []
          const monthlyBonus = calculateMonthlyBonus ? calculateMonthlyBonus(updatedUser) : 0
          const pointsSummary = getUserPointsSummary(updatedUser)

          // ✅ Save new level and achievements to DB
          updatedUser.level = levelData.level
          updatedUser.achievements = earnedAchievements
          await updatedUser.save()
          console.log("✅ Updated User Saved:", updatedUser)



          return NextResponse.json({
            productName: product.product_name,
            brand: product.brands || "Unknown",
            carbonEstimate: carbonEstimate.toFixed(2),
            category: carbonData.category,
            confidence: carbonData.confidence,
            calculation: carbonData.calculation,
            ingredients: product.ingredients_text || "Not available",
            packaging,
            rewards: {
              pointsEarned,
              pointsType: isConfirmed ? 'confirmed' : 'unconfirmed',
              reasons: pointsData.reasons,
              pointsSummary,
              level: updatedUser.level,
              leveledUp: levelData.level > oldLevel,
              newAchievements: earnedAchievements,
              streakCount: updatedUser.streakCount,
              monthlyBonus,
              sustainabilityTier:
                updatedUser.monthlyCarbon < 10 && updatedUser.totalScanned >= 15 ? 'Platinum' :
                  updatedUser.monthlyCarbon < 20 && updatedUser.totalScanned >= 10 ? 'Gold' :
                    updatedUser.monthlyCarbon < 30 && updatedUser.totalScanned >= 5 ? 'Silver' :
                      updatedUser.monthlyCarbon < 40 ? 'Bronze' : 'Beginner',
              pendingConfirmationInfo: (() => {
                const confirmationData = confirmPendingPoints
                  ? confirmPendingPoints(updatedUser)
                  : { confirmedPoints: 0, confirmedTransactions: [] }

                return confirmationData.confirmedPoints > 0
                  ? {
                    pointsConfirmed: confirmationData.confirmedPoints,
                    transactionsConfirmed: confirmationData.confirmedTransactions.length
                  }
                  : null
              })()
            }
          })
        }
      } catch (dbError) {
        console.error("🔥 Failed to update user stats:", dbError)
        return NextResponse.json({ error: "Database error" }, { status: 500 })
      }
    }

    return NextResponse.json({
      productName: product.product_name,
      brand: product.brands || "Unknown",
      carbonEstimate: carbonEstimate.toFixed(2),
      category: carbonData.category,
      confidence: carbonData.confidence,
      calculation: carbonData.calculation,
      ingredients: product.ingredients_text || "Not available",
      packaging
    })
  } catch (error) {
    console.error("🔥 Error in scan API:", error)
    return NextResponse.json({ error: "Failed to scan product" }, { status: 500 })
  }
}
