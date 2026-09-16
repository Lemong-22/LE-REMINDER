"use client";

import { motion, useInView } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import "./AnimatedList.css";

const AnimatedItem = ({
	children,
	delay = 0,
	index,
	onMouseEnter,
	onClick,
}) => {
	const ref = useRef(null);
	const inView = useInView(ref, { amount: 0.1, triggerOnce: true });
	return (
		<motion.div
			ref={ref}
			data-index={index}
			onMouseEnter={onMouseEnter}
			onClick={onClick}
			initial={{ scale: 0.96, opacity: 0, y: 8 }}
			animate={
				inView
					? { scale: 1, opacity: 1, y: 0 }
					: { scale: 0.96, opacity: 0, y: 8 }
			}
			transition={{ duration: 0.25, delay }}
			style={{ marginBottom: "0.875rem" }}
		>
			{children}
		</motion.div>
	);
};

/**
 * @param {{
 *   items?: any[];
 *   renderItem?: (item: any, index: number, isSelected: boolean) => React.ReactNode;
 *   onItemSelect?: (item: any, index: number) => void;
 *   showGradients?: boolean;
 *   enableArrowNavigation?: boolean;
 *   className?: string;
 *   itemClassName?: string;
 *   displayScrollbar?: boolean;
 *   initialSelectedIndex?: number;
 * }} props
 */
const AnimatedList = ({
	items = [],
	renderItem,
	onItemSelect,
	showGradients = false,
	enableArrowNavigation = true,
	className = "",
	itemClassName = "",
	displayScrollbar = true,
	initialSelectedIndex = -1,
}) => {
	const listRef = useRef(null);
	const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
	const [keyboardNav, setKeyboardNav] = useState(false);
	const [topGradientOpacity, setTopGradientOpacity] = useState(0);
	const [bottomGradientOpacity, setBottomGradientOpacity] = useState(1);

	const handleItemMouseEnter = useCallback((index) => {
		setSelectedIndex(index);
	}, []);

	const handleItemClick = useCallback(
		(item, index) => {
			setSelectedIndex(index);
			if (onItemSelect) {
				onItemSelect(item, index);
			}
		},
		[onItemSelect],
	);

	const handleScroll = useCallback((e) => {
		const { scrollTop, scrollHeight, clientHeight } = e.target;
		setTopGradientOpacity(Math.min(scrollTop / 50, 1));
		const bottomDistance = scrollHeight - (scrollTop + clientHeight);
		setBottomGradientOpacity(
			scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1),
		);
	}, []);

	useEffect(() => {
		if (!enableArrowNavigation) return;
		const handleKeyDown = (e) => {
			if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
				e.preventDefault();
				setKeyboardNav(true);
				setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
			} else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
				e.preventDefault();
				setKeyboardNav(true);
				setSelectedIndex((prev) => Math.max(prev - 1, 0));
			} else if (e.key === "Enter") {
				if (selectedIndex >= 0 && selectedIndex < items.length) {
					e.preventDefault();
					if (onItemSelect) {
						onItemSelect(items[selectedIndex], selectedIndex);
					}
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [items, selectedIndex, onItemSelect, enableArrowNavigation]);

	useEffect(() => {
		if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;
		const container = listRef.current;
		const selectedItem = container.querySelector(
			`[data-index="${selectedIndex}"]`,
		);
		if (selectedItem) {
			const extraMargin = 50;
			const containerScrollTop = container.scrollTop;
			const containerHeight = container.clientHeight;
			const itemTop = selectedItem.offsetTop;
			const itemBottom = itemTop + selectedItem.offsetHeight;
			if (itemTop < containerScrollTop + extraMargin) {
				container.scrollTo({ top: itemTop - extraMargin, behavior: "smooth" });
			} else if (
				itemBottom >
				containerScrollTop + containerHeight - extraMargin
			) {
				container.scrollTo({
					top: itemBottom - containerHeight + extraMargin,
					behavior: "smooth",
				});
			}
		}
		setKeyboardNav(false);
	}, [selectedIndex, keyboardNav]);

	return (
		<div className={`scroll-list-container ${className}`}>
			<div
				ref={listRef}
				className={`scroll-list ${!displayScrollbar ? "no-scrollbar" : ""}`}
				onScroll={handleScroll}
			>
				{items.map((item, index) => (
					<AnimatedItem
						key={
							typeof item === "object" && item.time
								? `${item.time}-${index}`
								: index
						}
						delay={Math.min(index * 0.04, 0.3)}
						index={index}
						onMouseEnter={() => handleItemMouseEnter(index)}
						onClick={() => handleItemClick(item, index)}
					>
						{renderItem ? (
							renderItem(item, index, selectedIndex === index)
						) : (
							<div
								className={`item ${selectedIndex === index ? "selected" : ""} ${itemClassName}`}
							>
								<p className="item-text">
									{typeof item === "string" ? item : JSON.stringify(item)}
								</p>
							</div>
						)}
					</AnimatedItem>
				))}
			</div>
			{showGradients && (
				<>
					<div
						className="top-gradient"
						style={{ opacity: topGradientOpacity }}
					/>
					<div
						className="bottom-gradient"
						style={{ opacity: bottomGradientOpacity }}
					/>
				</>
			)}
		</div>
	);
};

export default AnimatedList;
