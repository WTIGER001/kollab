import type { NavigateFunction } from "react-router-dom";

export const getLegacyNavigateFn = (navigate: NavigateFunction) => {
  return (
    team: string | null,
    project: string | null,
    page: string | null,
    isSettings = false,
    isTeamSettings = false,
    isFavoritesPage = false,
    isRecentsPage = false,
    isAuditPage = false,
    isTrashPage = false,
    isTasksPage = false,
    isMentionsPage = false,
    isImagesPage = false,
    isTemplatesPage = false
  ) => {
    let url = "/";
    if (team === "_admin") url = "/_admin/settings";
    else if (team === "_admin_help") url = "/_admin/help";
    else if (isFavoritesPage) url = "/my/favorites";
    else if (isRecentsPage) url = "/my/recents";
    else if (isTasksPage) url = "/my/tasks";
    else if (isMentionsPage) url = "/my/mentions";
    else if (team) {
      if (team === "personal" || team.startsWith("personal_")) {
        if (isTrashPage) url = "/personal/trash";
        else if (isImagesPage) url = "/personal/_images";
        else if (isTemplatesPage) url = "/personal/_templates";
        else if (isSettings || isTeamSettings) url = "/personal/_settings";
        else if (page) url = `/personal/docs/${page}${isAuditPage ? "/viewers" : ""}`;
        else url = "/personal";
      } else {
        if (project) {
          if (isTrashPage) url = `/teams/${team}/p/${project}/trash`;
          else if (isImagesPage) url = `/teams/${team}/p/${project}/_images`;
          else if (isTemplatesPage) url = `/teams/${team}/p/${project}/_templates`;
          else if (isSettings) url = `/teams/${team}/p/${project}/_settings`;
          else if (page) url = `/teams/${team}/p/${project}/docs/${page}${isAuditPage ? "/viewers" : ""}`;
          else url = `/teams/${team}/p/${project}`;
        } else {
          if (isTrashPage) url = `/teams/${team}/trash`;
          else if (isImagesPage) url = `/teams/${team}/_images`;
          else if (isTemplatesPage) url = `/teams/${team}/_templates`;
          else if (isSettings || isTeamSettings) url = `/teams/${team}/_settings`;
          else if (page) url = `/teams/${team}/docs/${page}${isAuditPage ? "/viewers" : ""}`;
          else url = `/teams/${team}`;
        }
      }
    }
    navigate(url);
  };
};
