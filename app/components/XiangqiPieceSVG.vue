<template>
  <svg
    viewBox="0 0 100 100"
    class="w-[90%] h-[90%] overflow-visible filter drop-shadow-xl"
  >
    <defs>
      <!-- Base Wood Gradient -->
      <radialGradient :id="`xq-base-${uid}`" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#fff0cc" />
        <stop offset="60%" stop-color="#deb474" />
        <stop offset="100%" stop-color="#ba8243" />
      </radialGradient>

      <!-- Edge/Rim Dark Gradient -->
      <linearGradient
        :id="`xq-edge-${uid}`"
        x1="0%"
        y1="0%"
        x2="100%"
        y2="100%"
      >
        <stop offset="0%" stop-color="#ffe1a6" />
        <stop offset="50%" stop-color="#a8713d" />
        <stop offset="100%" stop-color="#5c3818" />
      </linearGradient>

      <!-- Reflection -->
      <linearGradient
        :id="`xq-reflect-${uid}`"
        x1="0%"
        y1="0%"
        x2="0%"
        y2="100%"
      >
        <stop offset="0%" stop-color="white" stop-opacity="0.3" />
        <stop offset="50%" stop-color="white" stop-opacity="0" />
      </linearGradient>

      <!-- Text Inner Shadow effect -->
      <filter
        :id="`xq-text-shadow-${uid}`"
        x="-20%"
        y="-20%"
        width="140%"
        height="140%"
      >
        <feOffset dx="1" dy="1" />
        <feGaussianBlur stdDeviation="1" result="offset-blur" />
        <feComposite
          operator="out"
          in="SourceGraphic"
          in2="offset-blur"
          result="inverse"
        />
        <feFlood flood-color="black" flood-opacity="0.7" result="color" />
        <feComposite operator="in" in="color" in2="inverse" result="shadow" />
        <feComposite operator="over" in="shadow" in2="SourceGraphic" />
      </filter>
    </defs>

    <!-- Outer Rim -->
    <circle cx="50" cy="50" r="48" :fill="`url(#xq-edge-${uid})`" />

    <!-- Inner Base -->
    <circle cx="50" cy="48" r="44" :fill="`url(#xq-base-${uid})`" />

    <!-- Top Highlights -->
    <circle cx="50" cy="48" r="44" :fill="`url(#xq-reflect-${uid})`" />

    <!-- Inner Ring -->
    <circle
      cx="50"
      cy="48"
      r="36"
      fill="none"
      stroke="rgba(0,0,0,0.15)"
      stroke-width="2"
    />
    <circle
      cx="50"
      cy="48"
      r="34"
      fill="none"
      stroke="rgba(255,255,255,0.3)"
      stroke-width="1"
    />

    <!-- Text Character -->
    <text
      x="50"
      y="65"
      font-family="'Kaiti', 'KaiTi_GB2312', serif"
      font-size="46"
      font-weight="900"
      text-anchor="middle"
      :fill="textColor"
      :filter="`url(#xq-text-shadow-${uid})`"
    >
      {{ textStr }}
    </text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Piece } from "~~/shared/xiangqi-engine";

const props = defineProps<{ piece: Piece }>();

const uid = Math.random().toString(36).substring(2, 9);
const pieceKey = computed(() => `${props.piece.color}-${props.piece.type}`);

const textColor = computed(() => {
  return props.piece.color === "w" ? "#c81b1b" : "#1a1a1a";
});

const textStr = computed(() => {
  const isRed = props.piece.color === "w";
  switch (props.piece.type) {
    case "k":
      return isRed ? "帥" : "將";
    case "a":
      return isRed ? "仕" : "士";
    case "b":
      return isRed ? "相" : "象";
    case "n":
      return isRed ? "傌" : "馬";
    case "r":
      return isRed ? "俥" : "車";
    case "c":
      return isRed ? "炮" : "砲";
    case "p":
      return isRed ? "兵" : "卒";
    default:
      return "";
  }
});
</script>
