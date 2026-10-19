import { Link } from 'react-router-dom'
import { Button } from '../components/ui'

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-5 py-28 text-center">
      <span className="font-display text-7xl">🌳</span>
      <h1 className="mt-4 font-display text-3xl font-bold text-white">This branch doesn't exist</h1>
      <p className="mt-2 text-sm text-slate-400">
        The page you were looking for was moved, renamed, or never grew in the first place.
      </p>
      <div className="mt-7 flex gap-2">
        <Link to="/">
          <Button>Back home</Button>
        </Link>
        <Link to="/dashboard">
          <Button variant="ghost">Go to dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
