"use client";

import { useEffect, useMemo, useState } from "react";

type Task = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
};

const STORAGE_KEY = "todoo:tasks";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  // carregar do localStorage
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setTasks(
          parsed.map((t) => ({
            id: t.id,
            title: t.title ?? "",
            description: typeof t.description === "string" ? t.description : "",
            completed: !!t.completed,
          }))
        );
      }
    } catch (err) {
      console.warn("Falha ao ler tarefas do storage", err);
    }
  }, []);

  // persistir no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.warn("Falha ao salvar tarefas no storage", err);
    }
  }, [tasks]);

  const remainingCount = useMemo(
    () => tasks.filter((t) => !t.completed).length,
    [tasks]
  );

  function addTask() {
    const title = newTitle.trim();
    if (!title) return;
    const description = newDescription.trim();
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setTasks((prev) => [{ id, title, description, completed: false }, ...prev]);
    setNewTitle("");
    setNewDescription("");
  }

  function toggleTask(id: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditingTitle(task.title);
    setEditingDescription(task.description ?? "");
  }

  function saveEdit() {
    if (!editingId) return;
    const title = editingTitle.trim();
    if (!title) return; // simples: evita salvar vazio
    const description = editingDescription.trim();
    setTasks((prev) => prev.map((t) => (t.id === editingId ? { ...t, title, description } : t)));
    setEditingId(null);
    setEditingTitle("");
    setEditingDescription("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingTitle("");
    setEditingDescription("");
  }

  function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function clearCompleted() {
    setTasks((prev) => prev.filter((t) => !t.completed));
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <h1 style={{ marginBottom: 16 }}>Todoo</h1>

      <section
        aria-label="Criar tarefa"
        style={{ display: "grid", gap: 8, marginBottom: 16 }}
      >
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTask();
          }}
          placeholder="Nova tarefa..."
          aria-label="Título da nova tarefa"
          style={{ padding: 8, border: "1px solid #ddd", borderRadius: 6 }}
        />
        <input
          type="text"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTask();
          }}
          placeholder="Descrição (opcional)"
          aria-label="Descrição da nova tarefa"
          style={{ padding: 8, border: "1px solid #ddd", borderRadius: 6 }}
        />
        <div>
          <button
            onClick={addTask}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "#111", color: "#fff" }}
          >
            Adicionar
          </button>
        </div>
      </section>

      <section aria-label="Lista de tarefas" style={{ display: "grid", gap: 8 }}>
        {tasks.length === 0 ? (
          <p style={{ color: "#666" }}>Nenhuma tarefa ainda. Adicione a primeira!</p>
        ) : (
          tasks.map((task) => (
            <article
              key={task.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: 8,
                border: "1px solid #eee",
                borderRadius: 8,
              }}
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task.id)}
                aria-label={task.completed ? "Marcar como não concluída" : "Marcar como concluída"}
              />

              <div style={{ flex: 1, display: "grid", gap: 6 }}>
                {editingId === task.id ? (
                  <>
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      aria-label="Editar título da tarefa"
                      placeholder="Título"
                      style={{ padding: 6, border: "1px solid #ddd", borderRadius: 6 }}
                    />
                    <input
                      value={editingDescription}
                      onChange={(e) => setEditingDescription(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      aria-label="Editar descrição da tarefa"
                      placeholder="Descrição (opcional)"
                      style={{ padding: 6, border: "1px solid #ddd", borderRadius: 6 }}
                    />
                  </>
                ) : (
                  <>
                    <span style={{
                      textDecoration: task.completed ? "line-through" : "none",
                      color: task.completed ? "#888" : "inherit",
                      fontWeight: 500,
                    }}>
                      {task.title}
                    </span>
                    {task.description ? (
                      <span style={{ color: "#666", fontSize: 14 }}>
                        {task.description}
                      </span>
                    ) : null}
                  </>
                )}
              </div>

              {editingId === task.id ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={saveEdit}
                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", background: "#111", color: "#fff" }}
                  >
                    Salvar
                  </button>
                  <button
                    onClick={cancelEdit}
                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", background: "#fff" }}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => startEdit(task)}
                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", background: "#fff" }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => removeTask(task.id)}
                    aria-label="Apagar tarefa"
                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", color: "#c00" }}
                  >
                    Apagar
                  </button>
                </div>
              )}
            </article>
          ))
        )}
      </section>

      {tasks.length > 0 && (
        <footer style={{ display: "flex", justifyContent: "space-between", marginTop: 16, color: "#555" }}>
          <span>{remainingCount} pendente(s)</span>
          <button
            onClick={clearCompleted}
            disabled={tasks.every((t) => !t.completed)}
            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", background: "#fff" }}
          >
            Limpar concluídas
          </button>
        </footer>
      )}
    </main>
  );
}
