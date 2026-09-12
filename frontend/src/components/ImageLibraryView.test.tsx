import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ImageLibraryView } from './ImageLibraryView';
import { fetchLibraryImages } from '../services/api';
vi.mock('react-router-dom', () => ({ useParams: () => ({teamId:'short-team',projectId:'short-project'}) }));
vi.mock('../hooks/queries', () => ({
 useTeams: () => ({data:[{id:'team-id',abbreviation:'short-team'}]}),
 useAllProjects: () => ({data:[{id:'project-id',teamId:'team-id',abbreviation:'short-project'}]}),
}));
vi.mock('../services/api', () => ({
 fetchLibraryImages: vi.fn().mockResolvedValue([]), uploadLibraryImage:vi.fn(),
 updateLibraryImageName:vi.fn(),deleteLibraryImage:vi.fn(),authenticatedMediaUrl:(url:string)=>url,
}));
describe('image library routing',()=>{
 it('resolves abbreviated routes to persisted team and project identifiers',async()=>{
  render(<ImageLibraryView scope="project"/>);
  await waitFor(()=>expect(fetchLibraryImages).toHaveBeenCalledWith('project','team-id','project-id'));
 });
});
