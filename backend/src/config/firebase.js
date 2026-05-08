const admin = require("firebase-admin");

// Mock in-memory storage for development
const mockStore = {
  users: [],
  sessions: [],
  sensorData: []
};

let db;

try {
  // Try to load Firebase key
  const serviceAccount = require("../../firebaseKey.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  db = admin.firestore();
  console.log("✅ Firebase connected with real credentials");
} catch (err) {
  // Fallback for development: use mock database
  console.log("⚠️  Firebase key not found, using mock database for development");
  
  // Mock database object
  db = {
    collection: (name) => ({
      add: async (data) => {
        console.log(`📝 [MOCK] Added to ${name}:`, data);
        if (!mockStore[name]) mockStore[name] = [];
        const doc = { id: "mock-" + Date.now(), ...data };
        mockStore[name].push(doc);
        return { id: doc.id };
      },
      where: (field, op, value) => ({
        where: (field2, op2, value2) => ({
          orderBy: (sortField, direction) => ({
            limit: (n) => ({
              get: async () => ({
                empty: true,
                docs: [],
                forEach: () => {}
              })
            }),
            get: async () => ({
              empty: true,
              docs: [],
              forEach: () => {}
            })
          }),
          limit: (n) => ({
            get: async () => ({
              empty: true,
              docs: [],
              forEach: () => {}
            })
          }),
          get: async () => ({
            empty: true,
            docs: [],
            forEach: () => {}
          })
        }),
        orderBy: (sortField, direction) => ({
          get: async () => ({
            empty: true,
            docs: [],
            forEach: () => {}
          })
        }),
        limit: (n) => ({
          get: async () => {
            const results = mockStore[name]?.filter(doc => doc[field] === value) || [];
            return {
              empty: results.length === 0,
              docs: results.slice(0, n).map(doc => ({
                id: doc.id,
                data: () => {
                  const { id, ...data } = doc;
                  return data;
                }
              })),
              forEach: (cb) => results.slice(0, n).forEach(cb)
            };
          }
        }),
        get: async () => {
          const results = mockStore[name]?.filter(doc => doc[field] === value) || [];
          return {
            empty: results.length === 0,
            docs: results.map(doc => ({
              id: doc.id,
              data: () => {
                const { id, ...data } = doc;
                return data;
              }
            })),
            forEach: (cb) => results.forEach(cb)
          };
        }
      }),
      orderBy: (field, direction) => ({
        get: async () => ({
          empty: true,
          docs: [],
          forEach: () => {}
        })
      }),
      get: async () => ({
        empty: true,
        docs: [],
        forEach: () => {}
      })
    })
  };
}

module.exports = db;