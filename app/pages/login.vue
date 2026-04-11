<script setup lang="ts">
import { useCaroGame } from "~/composables/useCaroGame";

const { isLoading } = useCaroGame();
const supabase = useSupabaseClient();

const identity = ref(""); // Can be username or email
const password = ref("");
const errorMsg = ref("");

const handleLogin = async () => {
  if (!identity.value || !password.value) {
    errorMsg.value = "Vui lòng nhập đầy đủ thông tin.";
    return;
  }

  errorMsg.value = "";
  isLoading.value = true;

  try {
    let email = identity.value;

    // 1. If 'identity' doesn't look like an email, try looking up the username via RPC
    if (!identity.value.includes("@")) {
      const { data: foundEmail, error: rpcError } = await (supabase as any).rpc('get_email_from_username', {
        target_username: identity.value
      });

      if (rpcError || !foundEmail) {
        errorMsg.value = "Username không tồn tại.";
        isLoading.value = false;
        return;
      }
      email = foundEmail;
    }

    // Attempt sign in
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password.value,
    });

    if (error) {
      if (error.message.includes("Invalid login credentials") && !identity.value.includes("@")) {
        errorMsg.value = "Đăng nhập bằng Username cần điền chính xác. Nếu không được, vui lòng thử dùng Email.";
      } else {
        errorMsg.value = "Thông tin đăng nhập không chính xác.";
      }
    } else {
      navigateTo("/");
    }
  } catch (err) {
    errorMsg.value = "Có lỗi xảy ra khi đăng nhập.";
  } finally {
    isLoading.value = false;
  }
};

const inputClass =
  "w-full rounded-xl border border-[rgba(179,224,193,0.12)] bg-[rgba(12,25,18,0.8)] px-4 py-3 text-white outline-none transition focus:border-caro-accent";
const primaryButtonClass =
  "w-full rounded-xl bg-caro-accent px-6 py-4 font-bold text-caro-bg-deep transition duration-200 hover:scale-[1.02] hover:shadow-[0_8px_20px_rgba(116,181,134,0.3)] disabled:opacity-50";
</script>

<template>
  <div class="flex min-h-[70vh] items-center justify-center py-12 px-4">
    <div
      class="w-full max-w-md space-y-8 rounded-[32px] border border-[rgba(179,224,193,0.12)] bg-[rgba(6,18,12,0.72)] p-8 md:p-10 backdrop-blur-[24px] shadow-2xl"
    >
      <div class="text-center">
        <div
          class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(74,164,111,0.15)] text-caro-accent mb-6"
        >
          <Icon name="mdi:lock-open" size="32" />
        </div>
        <h2 class="text-3xl font-bold text-white mb-2">Đăng nhập</h2>
        <p class="text-[rgba(231,243,235,0.6)]">Vào ván đấu với tài khoản của bạn.</p>
      </div>

      <form class="space-y-6" @submit.prevent="handleLogin">
        <div>
          <label class="block text-xs font-bold uppercase tracking-widest text-caro-accent mb-2">Username hoặc Email</label>
          <input
            v-model="identity"
            type="text"
            placeholder="username / your@email.com"
            :class="inputClass"
            required
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-xs font-bold uppercase tracking-widest text-caro-accent">Mật khẩu</label>
            <a href="#" class="text-[10px] text-[rgba(231,243,235,0.4)] hover:text-caro-accent transition">Quên mật khẩu?</a>
          </div>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            :class="inputClass"
            required
          />
        </div>

        <div v-if="errorMsg" class="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-red-400 text-sm">
          {{ errorMsg }}
        </div>

        <button :class="primaryButtonClass" :disabled="isLoading">
          <span v-if="isLoading">Đang xử lý...</span>
          <span v-else>Đăng nhập</span>
        </button>

        <p class="text-center text-sm text-[rgba(231,243,235,0.5)]">
          Chưa có tài khoản?
          <NuxtLink to="/register" class="text-caro-accent hover:underline font-bold">Tạo tài khoản mới</NuxtLink>
        </p>
      </form>
    </div>
  </div>
</template>
