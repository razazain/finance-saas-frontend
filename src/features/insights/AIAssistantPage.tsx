import { useState, type FormEvent } from "react";
import { Bot, Send, Sparkles, WandSparkles } from "lucide-react";
import {
  Button,
  Card,
  Field,
  Input,
  Notice,
  PageHeader,
  Select,
} from "@/components/ui";
import { financeApi } from "@/lib/api/services";
import { getApiErrorMessage } from "@/lib/api/client";

type Mode =
  "assistant" | "transaction-draft" | "anomaly-review" | "inventory-advice";
export default function AIAssistantPage() {
  const [mode, setMode] = useState<Mode>("assistant");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ask = async (e: FormEvent) => {
    e.preventDefault();
    if (
      (mode === "assistant" || mode === "transaction-draft") &&
      question.trim().length < 5
    ) {
      setError("Enter at least 5 characters.");
      return;
    }
    setBusy(true);
    setError("");
    setAnswer(null);
    try {
      let result: any;
      if (mode === "assistant")
        result = await financeApi.askAi(question.trim());
      else if (mode === "transaction-draft")
        result = await financeApi.transactionDraft(question.trim());
      else if (mode === "anomaly-review")
        result = await financeApi.anomalyReview(90);
      else result = await financeApi.inventoryAdvice();
      setAnswer(result);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const modeLabel =
    mode === "assistant"
      ? "Finance question"
      : mode === "transaction-draft"
        ? "Transaction draft"
        : mode === "anomaly-review"
          ? "Transaction anomaly review"
          : "Inventory advice";
  return (
    <div className="page-stack">
      <PageHeader
        title="Munshee AI Assistant"
        description="AI workflows powered by your configured Groq backend. Financial actions remain under your review."
      />
      <Card className="form-card">
        <div className="form-section-top">
          <div className="summary-icon">
            <Bot size={20} />
          </div>
          <div>
            <h2>Choose an AI workflow</h2>
            <p>
              Responses are based on available business records and backend
              validation.
            </p>
          </div>
          <Sparkles size={18} />
        </div>
        <form className="form-stack" onSubmit={ask}>
          <Field label="Workflow">
            <Select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as Mode);
                setAnswer(null);
                setError("");
              }}
            >
              <option value="assistant">Ask Munshee about my finances</option>
              <option value="transaction-draft">
                Draft a transaction from natural language
              </option>
              <option value="anomaly-review">
                Review unusual or duplicate transactions
              </option>
              <option value="inventory-advice">
                Inventory restocking advice
              </option>
            </Select>
          </Field>
          {(mode === "assistant" || mode === "transaction-draft") && (
            <Field
              label={
                mode === "assistant"
                  ? "Your question"
                  : "Describe the transaction"
              }
              required
              error={error}
            >
              <Input
                autoFocus
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  setError("");
                }}
                placeholder={
                  mode === "assistant"
                    ? "e.g. Mere outstanding invoices kitne hain?"
                    : "e.g. Kal office rent 25000 cash se pay kiya"
                }
              />
            </Field>
          )}
          {mode !== "assistant" && mode !== "transaction-draft" && (
            <p className="field-hint">
              {mode === "anomaly-review"
                ? "The backend will review recent transactions for potential anomalies."
                : "The backend will analyze inventory and return restocking recommendations."}
            </p>
          )}
          <div className="form-actions">
            <Button type="submit" loading={busy} icon={<Send size={15} />}>
              {mode === "assistant"
                ? "Ask Munshee"
                : mode === "transaction-draft"
                  ? "Generate draft"
                  : mode === "anomaly-review"
                    ? "Review transactions"
                    : "Get inventory advice"}
            </Button>
          </div>
        </form>
      </Card>
      {answer && (
        <Card className="form-card">
          <div className="card-heading">
            <div>
              <h2>{modeLabel} result</h2>
              <p>Generated by the backend; verify before acting</p>
            </div>
            <WandSparkles size={19} />
          </div>
          {mode === "assistant" && answer.answer ? (
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.75 }}>
              {answer.answer}
            </div>
          ) : (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                fontSize: 13,
                lineHeight: 1.65,
              }}
            >
              {JSON.stringify(answer, null, 2)}
            </pre>
          )}
          {answer.disclaimer && (
            <Notice tone="info">{answer.disclaimer}</Notice>
          )}
          {mode === "transaction-draft" && (
            <Notice tone="warning" title="Draft only">
              This response has not created or posted a transaction. Review the
              suggested fields and enter the transaction through the regular
              transaction form to save it.
            </Notice>
          )}
        </Card>
      )}
      {error && (
        <Notice tone="danger" title="AI request failed">
          {error}
        </Notice>
      )}
      <Notice tone="warning" title="Financial safety">
        Munshee AI explains records and generates suggestions. It does not
        autonomously post transactions, reverse payments, send emails, or
        replace professional accounting advice.
      </Notice>
    </div>
  );
}
