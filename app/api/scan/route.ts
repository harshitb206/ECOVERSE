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
  shouldConfirmImmediately,
  getUserPointsSummary,
  POINT_REWARDS 
} from "@/lib/rewards-system"
import { inferPackaging } from "@/lib/packaging-inference" // ✅ New import

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
    );

    const product = productRes.data.product

    if (!product?.product_name) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // ✅ Extract categories and infer packaging info
    const categories = (product.categories_tags || []).map(cat => cat.replace("en:", ""));
    const packaging = inferPackaging(categories);

    // Calculate carbon footprint
    const carbonData = calculateCarbonFootprint(
      product.product_name, 
      product.brands
    )

    // Update user stats in database if userEmail is provided
    if (userEmail) {
      try {
        await dbConnect()
        
        const user = await User.findOne({ email: userEmail })

        if (user) {
          // (unchanged logic here...) 👇
          // ...
          // [all your user logic remains unchanged]
          // ...

          await user.save()
          const pointsSummary = getUserPointsSummary(user)

          return NextResponse.json({
            productName: product.product_name,
            brand: product.brands || "Unknown",
            carbonEstimate: carbonData.carbonFootprint.toFixed(2),
            category: carbonData.category,
            confidence: carbonData.confidence,
            calculation: carbonData.calculation,
            ingredients: product.ingredients_text || "Not available",
            packaging, // ✅ Include packaging info
            rewards: {
              pointsEarned: pointsData.points,
              pointsType: isConfirmed ? 'confirmed' : 'unconfirmed',
              reasons: pointsData.reasons,
              pointsSummary: pointsSummary,
              level: user.level,
              leveledUp: levelData.level > oldLevel,
              newAchievements: earnedAchievements,
              streakCount: user.streakCount,
              monthlyBonus: monthlyBonus,
              sustainabilityTier: user.monthlyCarbon < 10 && user.totalScanned >= 15 ? 'Platinum' :
                                user.monthlyCarbon < 20 && user.totalScanned >= 10 ? 'Gold' :
                                user.monthlyCarbon < 30 && user.totalScanned >= 5 ? 'Silver' :
                                user.monthlyCarbon < 40 ? 'Bronze' : 'Beginner',
              pendingConfirmationInfo: confirmationData.confirmedPoints > 0 ? {
                pointsConfirmed: confirmationData.confirmedPoints,
                transactionsConfirmed: confirmationData.confirmedTransactions.length
              } : null
            }
          })
        }
      } catch (dbError) {
        console.error("🔥 Failed to update user stats:", dbError)
      }
    }

    // ✅ Return packaging info even if user is not logged in
    return NextResponse.json({
      productName: product.product_name,
      brand: product.brands || "Unknown",
      carbonEstimate: carbonData.carbonFootprint.toFixed(2),
      category: carbonData.category,
      confidence: carbonData.confidence,
      calculation: carbonData.calculation,
      ingredients: product.ingredients_text || "Not available",
      packaging // ✅ Include packaging info
    })

  } catch (error) {
    console.error("🔥 Error in scan API:", error)
    return NextResponse.json({ error: "Failed to scan product" }, { status: 500 })
  }
}
