// In-memory fake Prisma client for multi-user WhatsApp job agent tests

function makeFakePrisma() {
  const opportunities = [];
  const notifications = [];
  const users = [];
  let opportunitySeq = 1;
  let notificationSeq = 1;
  let userSeq = 1;

  function findOpportunity(where) {
    return opportunities.find((o) => {
      if (where.fingerprint) return o.fingerprint === where.fingerprint;
      if (where.canonicalUrl) return o.canonicalUrl === where.canonicalUrl;
      if (where.id) return o.id === where.id;
      return false;
    });
  }

  function findUser(where) {
    return users.find((u) => {
      if (where.phoneNumber) return u.phoneNumber === where.phoneNumber;
      if (where.id) return u.id === where.id;
      return false;
    });
  }

  return {
    opportunity: {
      findUnique: async ({ where }) => findOpportunity(where) || null,
      findFirst: async ({ where }) => {
        return (
          opportunities.find(
            (o) =>
              (!where.source || o.source === where.source) &&
              (!where.externalId || o.externalId === where.externalId)
          ) || null
        );
      },
      findMany: async ({ where = {}, take, skip = 0 } = {}) => {
        let list = opportunities.filter((o) => {
          if (where.type && o.type !== where.type) return false;
          if (where.status && o.status !== where.status) return false;
          return true;
        });
        if (skip) list = list.slice(skip);
        if (take) list = list.slice(0, take);
        return list;
      },
      create: async ({ data }) => {
        const exists = opportunities.some(
          (o) => o.fingerprint === data.fingerprint || o.canonicalUrl === data.canonicalUrl
        );
        if (exists) {
          const err = new Error('Unique constraint failed on Opportunity');
          err.code = 'P2002';
          throw err;
        }
        const row = {
          id: `opp_${opportunitySeq++}`,
          status: 'OPEN',
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        opportunities.push(row);
        return row;
      },
      update: async ({ where, data }) => {
        const row = findOpportunity(where);
        if (!row) throw new Error('Opportunity not found');
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
      count: async () => opportunities.length,
      groupBy: async () => [],
    },

    user: {
      findUnique: async ({ where }) => findUser(where) || null,
      findFirst: async ({ where = {} } = {}) => {
        if (!where) return users[0] || null;
        return findUser(where);
      },
      findMany: async ({ where = {} } = {}) => {
        return users.filter((u) => {
          if (where.isActive !== undefined && u.isActive !== where.isActive) return false;
          return true;
        });
      },
      create: async ({ data }) => {
        const exists = users.some((u) => u.phoneNumber === data.phoneNumber);
        if (exists) {
          const err = new Error('Unique constraint failed on User.phoneNumber');
          err.code = 'P2002';
          throw err;
        }
        const row = {
          id: `user_${userSeq++}`,
          phoneNumber: data.phoneNumber,
          name: data.name || null,
          desiredRoles: data.desiredRoles || [],
          desiredLocations: data.desiredLocations || [],
          desiredOpportunityTypes: data.desiredOpportunityTypes || [],
          excludedCompanies: data.excludedCompanies || [],
          remoteOnly: data.remoteOnly || false,
          minimumRelevanceScore: data.minimumRelevanceScore || 75,
          keywords: data.keywords || [],
          rawPrompt: data.rawPrompt || null,
          isActive: data.isActive !== undefined ? data.isActive : true,
          onboardedAt: new Date(),
          lastMessageAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        users.push(row);
        return row;
      },
      update: async ({ where, data }) => {
        const row = findUser(where);
        if (!row) throw new Error('User not found');
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
      count: async () => users.length,
    },

    notification: {
      create: async ({ data }) => {
        const exists = notifications.some(
          (n) =>
            n.opportunityId === data.opportunityId &&
            n.userId === data.userId &&
            n.channel === data.channel &&
            n.type === data.type
        );
        if (exists) {
          const err = new Error('Unique constraint failed on Notification');
          err.code = 'P2002';
          throw err;
        }
        const row = {
          id: `notif_${notificationSeq++}`,
          createdAt: new Date(),
          sentAt: null,
          status: 'PENDING',
          ...data,
        };
        notifications.push(row);
        return row;
      },
      update: async ({ where, data }) => {
        const row = notifications.find((n) => n.id === where.id);
        if (!row) throw new Error('Notification not found');
        Object.assign(row, data);
        return row;
      },
      count: async ({ where = {} } = {}) => {
        return notifications.filter((n) => {
          if (where.status && n.status !== where.status) return false;
          return true;
        }).length;
      },
      groupBy: async () => [],
    },

    source: {
      upsert: async () => ({}),
    },

    $queryRaw: async () => [{ 1: 1 }],

    _internal: { opportunities, notifications, users },
  };
}

module.exports = { makeFakePrisma };
