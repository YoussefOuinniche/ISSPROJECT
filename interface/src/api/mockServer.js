const STORAGE_KEY = 'skillpulse.mock.db.v1';

const latency = () => 300 + Math.floor(Math.random() * 500);

const seedDb = {
  settings: {
    currentUser: {
      id: 1,
      full_name: 'Admin User',
      email: 'admin@skillpulse.com',
      role: 'admin',
      updated_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
    },
    currentProfile: {
      domain: 'Technology',
      title: 'Platform Administrator',
      experience_level: 'Senior',
      last_analysis_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      updated_at: new Date().toISOString(),
    },
    system: {
      totalUsers: 28,
      totalAdmins: 3,
      totalSkills: 164,
      totalTrends: 47,
      totalSkillGaps: 22,
    },
  },
  users: Array.from({ length: 28 }).map((_, index) => {
    const isAdmin = index % 11 === 0;
    const createdAt = new Date(Date.now() - index * 1000 * 60 * 60 * 16).toISOString();
    return {
      id: index + 1,
      full_name: isAdmin ? `Admin ${index + 1}` : `User ${index + 1}`,
      email: `${isAdmin ? 'admin' : 'user'}${index + 1}@mail.com`,
      role: isAdmin ? 'admin' : 'user',
      status: index % 7 === 0 ? 'disabled' : 'active',
      created_at: createdAt,
      updated_at: createdAt,
    };
  }),
  notifications: [
    { id: 'n1', title: 'New users joined', read: false, time: '2m ago' },
    { id: 'n2', title: 'Analytics refreshed', read: false, time: '12m ago' },
    { id: 'n3', title: 'Weekly digest available', read: true, time: '1h ago' },
  ],
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maybeFail() {
  if (Math.random() < 0.06) {
    throw new Error('Simulated network failure. Please retry.');
  }
}

function readDb() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedDb));
    return structuredClone(seedDb);
  }
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedDb));
    return structuredClone(seedDb);
  }
}

function writeDb(nextDb) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDb));
}

function recomputeSystem(db) {
  const totalUsers = db.users.length;
  const totalAdmins = db.users.filter((user) => user.role === 'admin').length;
  db.settings.system.totalUsers = totalUsers;
  db.settings.system.totalAdmins = totalAdmins;
}

export async function mockRequest(action, payload = {}) {
  await wait(latency());
  maybeFail();

  const db = readDb();

  switch (action) {
    case 'getSettings': {
      const recentUsers = [...db.users]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 12);
      return {
        ...db.settings,
        recentUsers,
      };
    }
    case 'getAdminAccount':
      return db.settings.currentUser;
    case 'updateAdminAccount': {
      db.settings.currentUser = {
        ...db.settings.currentUser,
        ...payload,
        updated_at: new Date().toISOString(),
      };
      writeDb(db);
      return db.settings.currentUser;
    }
    case 'updateSettings': {
      db.settings.currentProfile = {
        ...db.settings.currentProfile,
        ...(payload.currentProfile || {}),
        updated_at: new Date().toISOString(),
      };
      writeDb(db);
      return db.settings;
    }
    case 'changePassword':
      return { ok: true };
    case 'runAnalysis': {
      db.settings.currentProfile.last_analysis_at = new Date().toISOString();
      db.settings.currentProfile.updated_at = new Date().toISOString();
      writeDb(db);
      return db.settings.currentProfile;
    }
    case 'getUsers': {
      const { query = '', role = 'all', page = 1, pageSize = 8 } = payload;
      const normalizedQuery = query.trim().toLowerCase();
      const filtered = db.users.filter((user) => {
        const roleMatch = role === 'all' ? true : user.role === role;
        const queryMatch =
          !normalizedQuery ||
          user.full_name.toLowerCase().includes(normalizedQuery) ||
          user.email.toLowerCase().includes(normalizedQuery) ||
          user.role.toLowerCase().includes(normalizedQuery);
        return roleMatch && queryMatch;
      });

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const paginated = filtered.slice(start, start + pageSize);

      return {
        items: paginated,
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      };
    }
    case 'updateUser': {
      const { id, patch } = payload;
      db.users = db.users.map((user) =>
        user.id === id
          ? { ...user, ...patch, updated_at: new Date().toISOString() }
          : user,
      );
      recomputeSystem(db);
      writeDb(db);
      return db.users.find((user) => user.id === id);
    }
    case 'deleteUser': {
      const { id } = payload;
      db.users = db.users.filter((user) => user.id !== id);
      recomputeSystem(db);
      writeDb(db);
      return { ok: true };
    }
    case 'getNotifications':
      return db.notifications;
    case 'markAllNotificationsRead': {
      db.notifications = db.notifications.map((item) => ({ ...item, read: true }));
      writeDb(db);
      return db.notifications;
    }
    default:
      throw new Error(`Unknown mock action: ${action}`);
  }
}

export default { mockRequest };
