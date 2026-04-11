<script setup lang="ts">
import BaseDialog from "./BaseDialog.vue";

const props = defineProps<{
  show: boolean;
  joiningRoomName?: string;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [password: string];
}>();

const passwordToJoin = defineModel<string>("password", { default: "" });

const inputClass =
  "w-full rounded-xl border border-[rgba(179,224,193,0.12)] bg-[rgba(12,25,18,0.8)] px-4 py-3 text-white outline-none transition focus:border-caro-accent";
const primaryButtonClass =
  "rounded-xl bg-caro-accent px-6 py-3 font-bold text-caro-bg-deep transition duration-200 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(116,181,134,0.3)]";
const ghostButtonClass =
  "rounded-xl border border-[rgba(179,224,193,0.12)] bg-transparent px-6 py-3 font-semibold text-white transition duration-200 hover:bg-white/5";
</script>

<template>
  <BaseDialog
    :show="show"
    title="Yêu cầu mật khẩu"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <p class="text-sm text-[rgba(231,243,235,0.6)]">
        Phòng
        <strong class="text-caro-accent">{{ joiningRoomName }}</strong> đang
        được bảo vệ. Vui lòng nhập mật khẩu để tham gia.
      </p>
      <input
        v-model="passwordToJoin"
        type="password"
        :class="inputClass"
        placeholder="Nhập mật khẩu tại đây..."
        autofocus
        @keyup.enter="emit('confirm', passwordToJoin)"
      />
    </div>

    <template #footer>
      <button :class="ghostButtonClass" @click="emit('close')">
        Hủy
      </button>
      <button
        :class="primaryButtonClass"
        :disabled="!passwordToJoin || isLoading"
        @click="emit('confirm', passwordToJoin)"
      >
        Xác nhận
      </button>
    </template>
  </BaseDialog>
</template>
