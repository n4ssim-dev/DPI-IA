// Entraîne un petit modèle de classification (normal / anormal) pour les
// constantes vitales, à partir d'un dataset synthétique généré depuis des
// seuils médicaux de référence (voir SPEC.md, sections 5.2 et 13).
//
// Le modèle est exporté au format TensorFlow.js dans
// frontend/public/models/constantes-model/, avec un fichier meta.json
// décrivant les seuils utilisés (réutilisé côté frontend comme repli en
// cas d'échec de chargement du modèle).
//
// Usage : npm install && npm run train:constantes

import * as tf from "@tensorflow/tfjs-node";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(
  __dirname,
  "..",
  "frontend",
  "public",
  "models",
  "constantes-model"
);

// Seuils médicaux de référence (plages "normales") et bornes plausibles de
// mesure utilisées pour la normalisation des entrées du modèle.
const RANGES = {
  tension_systolique: {
    label: "Tension systolique",
    unit: "mmHg",
    min: 60,
    max: 220,
    normalMin: 90,
    normalMax: 140,
  },
  tension_diastolique: {
    label: "Tension diastolique",
    unit: "mmHg",
    min: 30,
    max: 140,
    normalMin: 60,
    normalMax: 90,
  },
  frequence_cardiaque: {
    label: "Fréquence cardiaque",
    unit: "bpm",
    min: 30,
    max: 200,
    normalMin: 60,
    normalMax: 100,
  },
  temperature: {
    label: "Température",
    unit: "°C",
    min: 34,
    max: 42,
    normalMin: 36.1,
    normalMax: 37.8,
  },
  glycemie: {
    label: "Glycémie",
    unit: "g/L",
    min: 0.2,
    max: 4,
    normalMin: 0.7,
    normalMax: 1.1,
  },
  saturation_o2: {
    label: "Saturation en oxygène",
    unit: "%",
    min: 70,
    max: 100,
    normalMin: 95,
    normalMax: 100,
  },
};

const TYPES = Object.keys(RANGES);
const N_PER_TYPE = 4000;

function buildDataset() {
  const features = [];
  const labels = [];

  for (let t = 0; t < TYPES.length; t++) {
    const type = TYPES[t];
    const { min, max, normalMin, normalMax } = RANGES[type];

    for (let i = 0; i < N_PER_TYPE; i++) {
      const value = min + Math.random() * (max - min);
      const normalized = (value - min) / (max - min);

      const oneHot = TYPES.map((_, idx) => (idx === t ? 1 : 0));
      features.push([...oneHot, normalized]);

      const isAbnormal = value < normalMin || value > normalMax ? 1 : 0;
      labels.push(isAbnormal);
    }
  }

  // Mélange (Fisher-Yates) pour ne pas avoir les exemples groupés par type.
  for (let i = features.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [features[i], features[j]] = [features[j], features[i]];
    [labels[i], labels[j]] = [labels[j], labels[i]];
  }

  return { features, labels };
}

function buildModel() {
  const model = tf.sequential();
  model.add(
    tf.layers.dense({
      inputShape: [TYPES.length + 1],
      units: 16,
      activation: "relu",
    })
  );
  model.add(tf.layers.dense({ units: 8, activation: "relu" }));
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
  model.compile({
    optimizer: tf.train.adam(0.01),
    loss: "binaryCrossentropy",
    metrics: ["accuracy"],
  });
  return model;
}

async function main() {
  const { features, labels } = buildDataset();
  const xs = tf.tensor2d(features);
  const ys = tf.tensor2d(labels, [labels.length, 1]);

  const model = buildModel();
  model.summary();

  const history = await model.fit(xs, ys, {
    epochs: 30,
    batchSize: 32,
    validationSplit: 0.1,
    verbose: 0,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if ((epoch + 1) % 5 === 0 || epoch === 0) {
          console.log(
            `epoch ${epoch + 1}: loss=${logs.loss.toFixed(4)} ` +
              `acc=${logs.acc.toFixed(4)} val_acc=${logs.val_acc.toFixed(4)}`
          );
        }
      },
    },
  });

  const finalAcc = history.history.val_acc.at(-1);
  console.log(`\nPrécision finale (validation) : ${(finalAcc * 100).toFixed(2)}%`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  await model.save(`file://${OUT_DIR}`);

  fs.writeFileSync(
    path.join(OUT_DIR, "meta.json"),
    JSON.stringify({ types: TYPES, ranges: RANGES }, null, 2)
  );

  console.log(`\nModèle exporté dans ${OUT_DIR}`);
}

main();
