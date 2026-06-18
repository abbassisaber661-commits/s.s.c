import axios from "axios";

export const updateProfile = async (data: any) => {
  const formData = new FormData();

  Object.keys(data).forEach((key) => {
    const value = data[key];

    if (value !== undefined) {
      formData.append(key, value);
    }
  });

  const res = await axios.put("/api/profile/update", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};