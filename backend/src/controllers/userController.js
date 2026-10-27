import * as userService from "../services/userService.js";
import { logAuditFromReq } from "../utils/auditLogger.js";

export async function list(req, res) {
  const users = await userService.listUsers();
  res.json(users);
}

export async function create(req, res) {
  const user = await userService.createUser(req.body);
  await logAuditFromReq(
    req,
    "Add Employee",
    "Employees",
    `Created employee ${user.fullname} (${user.email}) as ${user.role}`,
  );
  res.status(201).json(user);
}

export async function update(req, res) {
  const before = await userService.getUserWithPermissions(req.params.id);
  const user = await userService.updateUser(req.params.id, req.body);
  if (!user) return res.status(404).json({ message: "User not found" });

  let desc = `Updated employee ${user.fullname}`;
  if (req.body.permissions) {
    desc += " — permissions changed";
  }
  if (req.body.role && before && before.role !== user.role) {
    desc += ` — role: ${before.role} → ${user.role}`;
  }
  await logAuditFromReq(req, "Edit Employee", "Employees", desc);
  res.json(user);
}

export async function remove(req, res) {
  const before = await userService.getUserWithPermissions(req.params.id);
  await userService.deleteUser(req.params.id);
  await logAuditFromReq(
    req,
    "Delete Employee",
    "Employees",
    `Deleted employee ${before?.fullname || req.params.id}`,
  );
  res.json({ success: true });
}
