export const upgrades = [
  {
    toVersion: 1,
    statements: [
      `CREATE TABLE centro_financeiro (
        id INTEGER PRIMARY KEY,
        nome VARCHAR(25) NOT NULL
      );`,
      `CREATE TABLE operacao_financeira (
        id INTEGER PRIMARY KEY,
        description VARCHAR(50),
        valueInCents INTEGER NOT NULL,
        date TEXT NOT NULL,
        centro_financeiro_id INTEGER NOT NULL,
        FOREIGN KEY(centro_financeiro_id) REFERENCES centro_financeiro(id)
      );`,
    ],
  },
]
