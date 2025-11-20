const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dph1vixgk/image/upload";
const UPLOAD_PRESET = "prescription_upload"; // ← use your exact preset name

const uploadToCloudinary = async (uri: string): Promise<string | null> => {
  const formData = new FormData();

  formData.append("file", {
    uri: uri,
    type: "image/jpeg",
    name: `upload_${Date.now()}.jpg`,
  } as any);

  formData.append("upload_preset", UPLOAD_PRESET); // ← required for unsigned uploads

  try {
    const response = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
      },
    });

    const result = await response.json();

    if (result.secure_url) {
      console.log("✅ Uploaded URL:", result.secure_url);
      return result.secure_url;
    } else {
      console.error("❌ Cloudinary error response:", result);
      return null;
    }
  } catch (error) {
    console.error("❌ Upload error:", error);
    return null;
  }
};