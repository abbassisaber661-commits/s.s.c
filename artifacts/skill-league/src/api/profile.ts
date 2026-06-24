export const updateProfile = async (data: any) => {
  const formData = new FormData();

  Object.keys(data).forEach((key) => {
    const value = data[key];
    if (value !== undefined) {
      formData.append(key, value);
    }
  });

  const res = await fetch("/api/profile/update", {
    method: "PUT",
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
};
