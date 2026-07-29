export default function ModuleShell({ title, hint = 'Contenu à venir.' }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm opacity-55">{hint}</p>
    </div>
  )
}
