import { Router } from "express";

const router = Router();

// =====================================================
// 🟢 Mock Database (مؤقتة الآن)
// لاحقاً نربطها بقاعدة بيانات حقيقية
// =====================================================
let profile = {
  id: "1",
  username: "user123",
  bio: "Hello I'm a developer",
  avatar: "",
  fullName: "User Name",
  location: "Tunisia",
  website: "https://example.com",
};

// =====================================================
// GET PROFILE
// =====================================================
router.get("/", (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("GET_PROFILE_ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
});

// =====================================================
// UPDATE PROFILE
// =====================================================
router.put("/", (req, res) => {
  try {
    const { username, bio, avatar, fullName, location, website } = req.body;

    // تحديث الحقول فقط إذا موجودة
    profile = {
      ...profile,
      username: username ?? profile.username,
      bio: bio ?? profile.bio,
      avatar: avatar ?? profile.avatar,
      fullName: fullName ?? profile.fullName,
      location: location ?? profile.location,
      website: website ?? profile.website,
    };

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: profile,
    });
  } catch (error) {
    console.error("UPDATE_PROFILE_ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
});

export default router;