export const evaluationData = {
  preliminaryScore: 91.67,
  repositoriesEvaluated: 3,
  architecture: {
    label: "Architecture Fact Coverage",
    score: 83.33,
    passed: 15,
    failed: 3,
    total: 18,
    failures: [
      { repository: "Conduit Node", count: 1 },
      { repository: "Microblog", count: 2 },
    ],
  },
  rag: {
    label: "RAG QA Accuracy",
    score: 100,
    passed: 9,
    failed: 0,
    total: 9,
  },
  security: {
    status: "not-evaluated" as const,
    title: "Not Evaluated",
    explanation:
      "Security F1 was not meaningfully evaluated because the evaluation dataset contained no verified positive security findings.",
  },
  scoreExplanation:
    "Calculated from Architecture Fact Coverage and RAG QA Accuracy. Security evaluation was excluded because the available dataset contained no positive security ground truth.",
};
