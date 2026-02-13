class Admin {
  static table = "admins";

  static schema = {
    id: "number",
    username: "string",
    email: "string",
    password: "string",
    created_at: "timestamp",
    updated_at: "timestamp",
  };
}

export default Admin;
    