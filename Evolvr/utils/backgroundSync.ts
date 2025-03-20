import BackgroundFetch from "react-native-background-fetch";
import { queryClient } from "@/lib/react-query";
import NetInfo from "@react-native-community/netinfo";

export const initBackgroundSync = () => {
  BackgroundFetch.configure(
    {
      minimumFetchInterval: 15, // minutes
      stopOnTerminate: false,
      enableHeadless: true,
      startOnBoot: true,
    },
    async (taskId: string) => {
      const netInfo = await NetInfo.fetch();

      if (netInfo.isConnected) {
        // Sync any pending mutations
        await queryClient.resumePausedMutations();
        await queryClient.invalidateQueries();
      }

      BackgroundFetch.finish(taskId);
    }
  );
};
